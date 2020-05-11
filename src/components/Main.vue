<template>
  <div class="main">
    <BootstrapTable
      ref="table"
      :columns="columns"
      :data="tbodyData"
      :options="options"
      @on-column-switch="onColumnSwitch"
    ></BootstrapTable>
    <div id="toolbar" class="toolbar">
      <div class="from-inline">
        <select-picker
          :dropdown-data="dateList"
          v-model="selecteDate"
          @change="changeSelect"
          multiple
        ></select-picker>
      </div>
      <div class="from-inline">收入：{{ incomeAmount }} 支出：-{{ sustainAmount }}</div>

      <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModal">添加账单</button>
    </div>

    <!-- 添加账单 -->
    <div class="modal fade show" id="myModal" data-backdrop="static">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h4 class="modal-title">添加账单</h4>
            <button type="button" class="close" data-dismiss="modal">&times;</button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-group">
                <label>账单时间:</label>
                <date-picker
                  v-model="categorieItem.date"
                  :lang="categorieItem.lang"
                  class="date-con"
                ></date-picker>
              </div>
              <div class="form-group">
                <label>账单分类:</label>
                <select v-model="categorieItem.type" class="form-control">
                  <option :key="item" v-for="item in categoriesType">
                    {{
                    item
                    }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>账单金额:</label>
                <input
                  type="number"
                  class="form-control"
                  v-model="categorieItem.amount"
                  placeholder="账单金额"
                />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" @click="save()">提交</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as table from "../utils/table";
import DatePicker from "vue2-datepicker";
import "vue2-datepicker/index.css";
import "vue2-datepicker/locale/zh-cn";

import Storage from "../utils/storage";

export default {
  name: "MainTable",
  components: { DatePicker },
  data() {
    return {
      columns: [],
      tbodyData: [],
      options: {
        showColumns: true,
        striped: true,
        toolbar: "#toolbar",
        pagination: true, //是否显示分页
        pageSize: 10, //每页显示的记录数
        pageNumber: 1, //当前第几页
        pageList: [10, 25, 50, 100], //记录数可选列表
        showFooter: true //必须
      },
      newData: {},
      dateList: [],
      selecteDate: [],
      hasSelecteDate: [],
      categoriesData: [],
      categoriesType: [],
      billData: [],
      incomeAmount: 0,
      sustainAmount: 0,
      columnsSwitchData: [],
      columnsField: [],
      categorieItem: {
        date: "",
        type: "",
        amount: null,
        lang: {
          formatLocale: {
            firstDayOfWeek: 1
          },
          monthBeforeYear: false
        }
      }
    };
  },
  mounted() {
    Promise.all([this.requestCategories(), this.requestBill()]).then(
      results => {
        this.categoriesData = results[0];
        this.billData = results[1];
      }
    );
  },
  watch: {
    categoriesData(val) {
      // 表头字段处理
      this.columns = [
        {
          field: "month",
          title: "月份",
          switchable: false,
          footerFormatter: table.totalTextFormatter
        }
      ];
      val.forEach(item => {
        this.columns.push({
          field: item[0],
          title: item[2],
          sortable: true,
          formatter: table.itemFormatter,
          footerFormatter: table.totalAmountFormatter
        });

        // 存储到新的数据结构中
        this.newData[item[0]] = {};
        this.newData[item[0]]["type"] = Number(item[1]);
        this.newData[item[0]]["name"] = item[2];

        // 账单分类
        this.categoriesType.push(item[2]);
      });
    },
    billData(val) {
      val.forEach(item => {
        if (!this.newData[item[2]].list) {
          this.newData[item[2]].list = [];
          this.newData[item[2]].listObj = {};
        }

        let itemObj = {
          type: Number(item[0]),
          time: Number(item[1]),
          amount: parseFloat(item[3])
        };
        let formatTime = this.$moment(Number(item[1])).format("YYYY-MM"); // 格式化时间
        itemObj["formatTime"] = formatTime;

        //0为支出，需要转负数
        itemObj["type"] === 0
          ? (itemObj["amountLable"] = -1 * itemObj["amount"])
          : (itemObj["amountLable"] = itemObj["amount"]);
        this.newData[item[2]].list.push(itemObj);

        // 列表内容根据月份展示，此处去除相同月份进行月份时间收集
        if (this.dateList.indexOf(formatTime) === -1) {
          this.dateList.push(formatTime);
        }

        // 账单数据有月份同类目消费重叠，需要对同月份相同消费进行叠加
        if (this.newData[item[2]].listObj[formatTime]) {
          this.newData[item[2]].listObj[formatTime]["amountLable"] +=
            itemObj["amountLable"];
        } else {
          this.newData[item[2]].listObj[formatTime] = itemObj;
        }
      });

      this.hasSelecteDate = this.dateList.sort();
      this.columnsField = this.columns.map(item => {
        return item.field;
      });
    },
    hasSelecteDate(val) {
      // 月份选择
      this.tbodyData = [];
      val.forEach(date => {
        let columnObj = {
          month: date
        };
        this.columns.forEach(column => {
          if (column.field !== "month") {
            if (this.newData[column.field].listObj[date]) {
              columnObj[column.field] = this.newData[column.field].listObj[
                date
              ].amountLable;
            } else {
              columnObj[column.field] = 0; // 无收入和支出，给赋值为0
            }
          }
        });
        this.tbodyData.push(columnObj);
      });

      this.refreshTatalAmount();
    }
  },
  methods: {
    requestCategories() {
      // 请求获取账单分类字段
      let p = new Promise((resolve, reject) => {
        if (Storage.get("categoriesData") != null) {
          let categoriesData = JSON.parse(Storage.get("categoriesData"));
          resolve(categoriesData);
        } else {
          this.$papa.parse("./csv/categories.csv", {
            download: true,
            complete: function(results) {
              let categoriesData = results.data.slice(1);
              Storage.set("categoriesData", JSON.stringify(categoriesData));
              resolve(categoriesData);
            }
          });
        }
      });
      return p;
    },
    requestBill() {
      // 请求获取账单数据
      let p = new Promise((resolve, reject) => {
        if (Storage.get("billData") != null) {
          let billData = JSON.parse(Storage.get("billData"));
          resolve(billData);
        } else {
          this.$papa.parse("./csv/bill.csv", {
            download: true,
            complete: function(results) {
              let billData = results.data.slice(1);
              Storage.set("billData", JSON.stringify(billData));
              resolve(billData);
            }
          });
        }
      });
      return p;
    },
    refreshTatalAmount() {
      // 计算收入和支出 1 代表收入，0 代表支出
      let sustainList = [];
      let incomeList = [];
      this.billData.forEach(row => {
        var month = this.$moment(Number(row[1])).format("YYYY-MM");
        if (
          this.hasSelecteDate.includes(month) &&
          this.columnsField.includes(row[2]) &&
          Number(row[0]) === 0
        ) {
          sustainList.push(Number(row[3]));
        } else {
          sustainList.push(0);
        }

        if (
          this.hasSelecteDate.includes(month) &&
          this.columnsField.includes(row[2]) &&
          Number(row[0]) === 1
        ) {
          incomeList.push(Number(row[3]));
        } else {
          incomeList.push(0);
        }
      });
      this.sustainAmount = sustainList
        .reduce((sum, i) => {
          return sum + i;
        }, 0)
        .toFixed(2);
      this.incomeAmount = incomeList
        .reduce((sum, i) => {
          return sum + i;
        }, 0)
        .toFixed(2);
    },
    onColumnSwitch() {
      // 头部字段筛选
      this.columnsSwitchData = this.$refs.table.getVisibleColumns();
      this.columnsField = this.columnsSwitchData.map(column => {
        return column.field;
      });
      this.refreshTatalAmount();
    },
    changeSelect({ data }) {
      // 日期选择
      this.selecteDate = this.hasSelecteDate = data;
      this.refreshTatalAmount();
    },
    changeCategoriesSelect({ text }) {
      // 账单分类选择
      this.categorieItem.type = text;
    },
    save() {
      if (this.categorieItem.date === "") {
        this.$toasted.show("请选择账单日期");
        return false;
      }
      if (this.categorieItem.type === "") {
        this.$toasted.show("请选择账单类型");
        return false;
      }
      if (
        this.categorieItem.amount === null ||
        this.categorieItem.amount === ""
      ) {
        this.$toasted.show("请输入账单金额");
        return false;
      }

      let selectCategoriesItem = this.categoriesData.filter(item => {
        return item[2] === this.categorieItem.type;
      });

      //  添加保存
      this.billData.push([
        selectCategoriesItem[0][1],
        this.$moment(this.categorieItem.date)
          .valueOf()
          .toString(),
        selectCategoriesItem[0][0],
        this.categorieItem.amount
      ]);
      Storage.set("billData", JSON.stringify(this.billData));

      this.$toasted.show("账单添加成功");
      jQuery("#myModal").modal("hide");
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.main {
  padding: 20px;
}
.from-inline {
  display: inline-block;
  margin-right: 10px;
}
.date-con {
  display: block;
}
</style>
