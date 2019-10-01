const express = require('express');
const request = require('request');
const cache = require('memory-cache');
const formidable = require('formidable');
const rand = require("../rand.js");

const router = express.Router();

router.get('/', (req, res, next) => {
  res.render('main');
});

router.post('/', (req, res, next) => {
  const phoneNumber = req.body.phoneNumber;
  const vaildTime = 180000; //유효시간 3분
  const authNumber = rand.authNo(6); //랜덤한 인증번호 생성 6자리
  console.log(authNumber);
  if (cache.get(phoneNumber)) {
    cache.del(phoneNumber);
    //유저가 인증번호 받은 이후에 다시 새롭게 인증번호 요청한 
    //경우가 있을 수 있으므로 기존의 인증번호는 삭제.
  }
  cache.put(phoneNumber, authNumber, vaildTime);//memory-cache에 key-value 값으로 등록.
  res.send(vaildTime.toString());
  //SMS 문자 전송. request로 ncloud sens에 발송요청을 보냄.
  request({
      method: 'POST',
      json: true,
      uri: `https://api-sens.ncloud.com/v1/sms/services/${process.env.SENS_SERVICEID}/messages`,
      headers: {
        'Content-Type': 'application/json',
        'X-NCP-auth-key': process.env.SENS_ACCESSKEYID,
        'X-NCP-service-secret': process.env.SENS_SERVICESECRET
      },
      body: {
        type: 'sms',
        from: process.env.SENS_SENDNUMBER,//발송번호
        to: [`${phoneNumber}`],//수신번호
        content: `[magnis] 인증번호 [${authNumber}]를 입력해주세요.`//문자 내용.
      }
    });

});

router.post('/verify', (req, res, next) => {
  var form = new formidable.IncomingForm();
  form.parse(req, (err, body) => {
    const phoneNumber = body.phoneNumber;
    const authNumber = body.authNumber;

    if (!cache.get(phoneNumber)) {
      //유효시간 초과시 memory-cache에서 data 삭제되므로
      console.log("time out");
      res.end("<h1>Time out</h1>");
    }
    else if (cache.get(phoneNumber) == authNumber) {
      console.log('sucess verified');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end("인증완료");
    }
    else {
      console.log("not verified");
      res.end("<h1>Bad Request</h1>");
    }
  });
});

module.exports = router;
