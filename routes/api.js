'use strict';
var mongoose = require('mongoose');
var stockSchema = new mongoose.Schema({
  code: String,
  likes: [{
    ip: String
  }]
});
const superagent = require('superagent');
var Stock = mongoose.model('stock', stockSchema);


module.exports = function (app) {

  app.get('/api/stock-prices', async function (req, res) {
    //check query
    let code = req.query.stock || '';
    if (!code) {
      res.json({
        Msg: 'no stock query'
      })
    }
    if (!Array.isArray(code)) {
      code = [code].map(v => v.toLowerCase());
    }

    const hostip = req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0] : req.headers.host.split(":")[0];

    (async () => {
      try {

        let price1 = await superagent.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${code[0]}/quote`);
        if (req.query.like) {
          // save like
          let found = await Stock.findOne({
            code: code[0]
          });
          let newIp = new Stock({
            code: code[0],
            likes: [{
              ip: hostip
            }]
          });

          if (!found) {
            await newIp.save({});
          } else if (found.likes.filter(item => item.ip == hostip).length == 0) {
            await Stock.findByIdAndUpdate(found._id, {
              $push: {
                "likes": {
                  ip: hostip,
                }
              }
            });
          }
        }
        let likescnt1 = await Stock.findOne({
          "code": code[0]
        });

        let tmp = {
          "stock": code[0].toUpperCase(),
          "price": JSON.parse(price1.text).latestPrice,
          "likes": likescnt1 ? likescnt1.likes.length : 0
        };


        if (code.length == 2) {
          let price2 = await superagent.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${code[1]}/quote`);
          if (req.query.like) {
            // save like
            let found = await Stock.findOne({
              code: code[1]
            });
            let newIp = new Stock({
              code: code[1],
              likes: [{
                ip: hostip
              }]
            });

            if (!found) {
              await newIp.save({});
            } else if (found.likes.filter(item => item.ip == hostip).length == 0) {
              await Stock.findByIdAndUpdate(found._id, {
                $push: {
                  "likes": {
                    ip: hostip,
                  }
                }
              });
            }
          }
          let likescnt2 = await Stock.findOne({
            "code": code[1]
          });

          let tmp1 = {
            "stock": code[1].toUpperCase(),
            "price": JSON.parse(price2.text).latestPrice,
            "likes": likescnt2 ? likescnt2.likes.length : 0
          };
          tmp.rel_likes = tmp.likes - tmp1.likes;
          tmp1.rel_likes = tmp1.likes - tmp.likes;
          delete tmp.likes;
          delete tmp1.likes;
          res.json({
            stockData: [tmp, tmp1]
          });
        } else {
          res.json({
            stockData: tmp
          });
        }

      } catch (err) {
        console.error(err);
      }
    })();



  });

};