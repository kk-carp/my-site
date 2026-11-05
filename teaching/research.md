# 第3章调查与源码导读

核对日期：2026-10-30。

## 产品参考

[Linkding 仓库与 README](https://github.com/sissbruecker/linkding) 描述书签管理、标签组织和搜索。用于讨论“添加链接→加标签→搜索回找”的用户任务。本项目仅借鉴流程，不复制其服务端、不要求部署 Linkding。该网页阅读不等于已实操其 UI，教师课堂需现场核对产品操作。Linkding 的页面不作为固定教学源码。

## 固定功能库

Papa Parse 精确固定 5.5.3，安装命令 `npm install --save-exact papaparse@5.5.3`，复现用 npm ci。[固定标签 package.json](https://github.com/mholt/PapaParse/blob/5.5.3/package.json) 与 npm 包 version 一致；本地教学快照在 vendor/papaparse-5.5.3/，包含源码、README、package.json 和 MIT LICENSE。

从快照 papaparse.js 追踪：62行 Papa.parse 指向191行 CsvToJson；63行 Papa.unparse 指向267行 JsonToCsv；380—383行读取 escapeFormulae，461行起应用公式保护。课堂打开真实源码核对，更新版本须重做行号记录。安装运行版本由锁文件决定；快照用于阅读。

[官方接口文档](https://www.papaparse.com/docs)：parse 解析语法并报告 errors；unparse 处理引号、逗号和换行，escapeFormulae 可增加保护前缀。库不会实现我们的 URL 校验、去重、预览确认或存储事务。

课堂最小输入：`title,url` 后一行 `"JavaScript, 入门",https://example.org/js`，预期一条数据、标题含逗号。先手算，再在 Node 导入库运行。对比本项目 csv.js 使用原始二维数组读取表头：官方 header:true 会自动重命名重复表头，因此应用主动检查重复，避免静默接受错误文件。

来源核对是资料与源码阅读；本地案例运行以 check:resources 日志为证据，不把线上文档当作测试结果。
