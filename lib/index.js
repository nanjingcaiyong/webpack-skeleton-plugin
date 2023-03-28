const { WebSocketServer } = require('ws');
const htmlWebpackPlugin = require('html-webpack-plugin');
const csstree = require('css-tree');
const path = require('path');
const fs = require('fs');
const { parse, walk, SyntaxKind } = require('html5parser');
const skeletonCSS = require('./skeletoncss')

const port = 9999;
let newHtml = '';

/**
 * @description 查询attrbutes中的class、style、data-v
 * @param { Node } node 
 * @returns 
 */
const queryNodeAttributes = (node) => {
  const mapper = {
    'class': (attr) => ({classes: attr.value.value}),
    'style': (attr) => ({styles: attr.value.value}),
    'data-v': (attr) => ({tag: attr.name.value})
  };
  return Array.isArray(node.attributes) && node.attributes.length > 0 
    ? node.attributes.reduce((obj, attr) => {
      const val = mapper[attr.name.value.slice(0, 6)]?.(attr) || {};
      const key = Object.keys(val)[0];
      // 多个data-v-xxx的属性
      if (obj[key]) {
        obj[key] = `${obj[key]} ${val[key]}`;
        return obj;
      }
      return Object.assign(obj, val);
    }, {})
    : {};
};

/**
 * @description 添加骨架样式
 * @param {*} node 
 * @returns 
 */
const appendSkeletonStyle = (node) => node.name === 'head' ? `<style>${skeletonCSS}</style>` : '';

/**
 * @description devserver 返回浏览器的html中插入脚本
 * @param { string } html 即将返回浏览器的html代码 
 * @returns { string } 新html代码
 */
const addScriptTag = (html) => {
  const tokens = html.split('</body>');
  const scriptTag = `
  <script>
    function generate() {
      var ws = new WebSocket(\'ws://localhost:${port}\');
      ws.onopen = function () {
        ws.send(document.documentElement.outerHTML)
      }}
  </script>
  `;
  return `${tokens[0]}${scriptTag}</body>${tokens[1]}`;
};

/**
 * @description 开发模式注入脚本
 * @param { Object } htmlPluginData  html-webpack-plugin 实例对象
 * @returns { undefined }
 */
const insertScriptToClient = (htmlPluginData) => {
  if (process.env.NODE_ENV !== 'production') {
    const oldHtml = htmlPluginData.html;
    htmlPluginData.html = addScriptTag(oldHtml);
  }
};


const handlerStyle = (styleStr) => {
  let ast = csstree.parse(styleStr);
  const deleteArr = [
    'font-family',
    'font-weight',
    'letter-spacing',
    'background-color',
    'background',
    'color',
    'justify-content',
    'font-weight',
    'z-index',
    'cursor',
    ''
  ];
  
  csstree.walk(ast, (nno, item, list) => {
    if (nno.type === 'Declaration' && deleteArr.includes(nno.property) && list) {
      list.remove(item);
    }
  });
  return csstree.generate(ast);
};

class SkeletonPlugin {
  constructor () {
    this.wss = null;
  }
  // compiler: 编译器
  apply (compiler) {
    let lastType;
    // 在done（编译完成）钩子中注册SkeletonPlugin
    compiler.hooks.done.tap('SkeletonPlugin', () => {
      if (this.wss === null) {
        this.wss = new WebSocketServer({ port });
      } 
      this.wss.on('connection', (ws, req) => {
        console.log('客户端已连接：', req.socket.remoteAddress);
        ws.on('message', message => {
          const html = `${message.toString('utf-8')}`
            .replace(/<script.*?>.*?<\/script>/g, '')
            .replace(/<meta.*?>/g, '')
            .replace(/<link.*?>/g, '')
            .replace(/\/\*.*?\*\//g, '')
            .replace(/<!-.+->/g, '')
            .replace(/background-image:.*\;/g, '')
            .replace(/<svg.*?>.*?<\/svg>/g, '');

          const ast = parse(html);
          walk(ast, {
            enter: (node) => {
              if (node.type === SyntaxKind.Tag && Array.isArray(node.body)) {
                let { classes='', styles='', tag='' } = queryNodeAttributes(node) || {};
                styles = styles.replace(/border(-color|-bottom)?:.*;/g, '') // 去除boder相关样式
                  .replace(/background(-.*)?:.*;/g, '') // 去除background相关样式
                  .replace(/\s*/, '');
                newHtml += `<${node.name}`;
                newHtml += tag ? ` ${tag}` : '';
                newHtml += classes.length > 0 ? ` class="${classes}"` : '';
                newHtml += styles.length > 0 ? ` style="${styles}"` : '';
                newHtml += '>';
              }
              newHtml += appendSkeletonStyle(node);
  
              if (lastType === 'style' && node.type === SyntaxKind.Text) {
                newHtml += handlerStyle(node.value);
              }
              if (lastType !== 'style' && node.type === SyntaxKind.Text) {
                newHtml += node.value;
              }
              newHtml = newHtml.replace(/\n[ ]+/g, '').replace(/\n/g, '');
              lastType = node.rawName;
            },
            leave: (node) => {
              if (node.type === SyntaxKind.Tag && Array.isArray(node.body)) {
                newHtml += `</${node.name}>`;
              }
            }
          });
          fs.writeFile(path.resolve(__dirname, 'test.html'), newHtml, {}, () => {});
        });
      });
    });

    // 给 compilation (编译阶段) 钩子注册 'SkeletonPlugin'，回调会在 compilation 对象创建之后触发
    compiler.hooks.compilation.tap('SkeletonPluginBY', (compilation) => {
      const htmlWebpackPluginBeforeHtmlProcessing = htmlWebpackPlugin.getHooks(compilation).afterTemplateExecution;
      htmlWebpackPluginBeforeHtmlProcessing.tap('SkeletonPluginBY', (htmlPluginData) => {
        insertScriptToClient(htmlPluginData);
        // callback(null, htmlPluginData);
      });
    });
  }
}
module.exports = SkeletonPlugin;