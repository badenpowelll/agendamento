const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:1000}});
await p.goto('file://'+__dirname+'/selo.html');await p.waitForSelector('body[data-ready]');await p.waitForTimeout(300);
await p.locator('#s').screenshot({path:__dirname+'/selo.png',omitBackground:true});await b.close();})();
