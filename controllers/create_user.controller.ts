import { checkEmail, checkName, checkPw } from "./validate";
import {
  dbFindUser,
  dbInsertUser,
  dbInsertUserEmailAuth,
  dbSelectUserEmailAuth,
  dbSuccessUserEmailAuth,
} from "../db/create_user.db";

import { CreateUserReqDTO } from "../types/user";
import { Handler } from "express";
import { Response } from "express-serve-static-core";
import bcrypt from "bcrypt";
import { mailSendAuthEmail } from "./email.controller";
import mql from "../db/mysql";

require("dotenv").config();
const saltRounds = 10;

//400 : 잘못된 요청.
//401 : 비인증. (비번틀림)
//403 : 비인증. (서버는 클라이언트가 누군지 알고있음).
//404 : 찾을 수 없음.
//409: 중복 경우 (충돌을 수정해서 요청을 다시 보낼 경우)

export const test: Handler = (req, res) => {
  //test
  const user = req.body;
  const param = [user.email, user.pw, user.nickName, user.profilePicture];
  console.log("🚀 ~ param", param);
  console.log("🚀 ~ req.body", param);

  let locationParam = req.body.location;

  let sql: string =
    "INSERT INTO usertbl(`email`, `pw`, `nickName`, `profilePicture`, `location`, `joinDate`) VALUES (?,?,?,?,?,NOW())";
  mql.query(sql, [...param, locationParam], (err, row) => {
    if (err) {
      return res.json({
        param: err,
      });
    }

    //1시간 뒤 임시 유저 데이터 삭제
    setTimeout(function () {
      //isAuth = 0이라면
      mql.query("SELECT * FROM usertbl WHERE nickName=?", "kk", (err, row) => {
        if (err) console.log(err);
        else if (row.length > 0) {
          mql.query(
            "DELETE FROM usertbl WHERE nickName=?",
            row[0].nickName,
            (err, row) => {
              if (err) console.log(err);
              console.log("삭제");
            }
          );
        }
        console.log("없");
      });
    }, 15000);
    return res.json({
      param: param,
    });
  });
};

export const creatUser = (
  user: CreateUserReqDTO,
  res: Response<any, Record<string, any>, number>
) => {
  //회원가입 할때 필요한 정보들을 client에서 가져오면
  //그것들을 데이터 베이스에 넣어준다.

  const param = [user.email, user.pw, user.nickName, user.profilePicture];
  //string | null
  const locationParam: string | null = user.location;

  //요청 데이터 유효성 검사
  if (!checkEmail(param[0]) || !checkPw(param[1]) || !checkName(param[2])) {
    let errMsg = "";
    let emailErr = checkEmail(param[0]) ? "" : "이메일 이상.";
    let pwErr = checkPw(param[1]) ? "" : "비밀번호 이상.";
    let nameErr = checkName(param[2]) ? "" : "닉네임 이상.";
    errMsg = errMsg + emailErr + pwErr + nameErr;
    console.log("errMsg:", errMsg);

    return res.status(400).json({ success: false, message: errMsg });
  }

  //(이메일) 유저가 있는지
  dbFindUser("email", param[0], function (err, isUser, user) {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: "이메일이 유효하지 않습니다." });
    } else if (isUser && user[0].isAuth === 0) {
      return res.status(403).json({
        success: false,
        message: "아직 이메일 인증을 하지 않은 유저입니다.",
      });
    } else if (isUser && user[0].isAuth === 1) {
      return res.status(409).json({
        success: false,
        message: "해당 이메일의 유저가 이미 존재합니다.",
      });
    }
    //(닉네임) 유저가 있는지
    dbFindUser("nickName", param[2], function (err, isUser, user) {
      if (err) {
        return res
          .status(400)
          .json({ success: false, message: "닉네임이 유효하지 않습니다." });
      } else if (isUser) {
        return res.status(409).json({
          success: false,
          message: "해당 닉네임의 유저가 이미 존재합니다.",
        });
      }
      // 회원가입 시 비밀번호
      bcrypt.hash(param[1], saltRounds, (error, hash) => {
        param[1] = hash;
        console.log(param);

        //DB에 추가 (인증 전)
        dbInsertUser(param, locationParam, function (success, error) {
          if (!success) {
            return res.status(400).json({ success: false, message: error });
          }
          return res.json({ success: true });
        });
      });
    });
  });
};

export const sendAuthEmail = (
  email: string,
  res: Response<any, Record<string, any>, number>
) => {
  //이메일 주소로 인증
  if (checkEmail(email)) {
    let authString: string = String(Math.random().toString(36).slice(2));
    dbInsertUserEmailAuth(email, authString, function (success, error) {
      if (!success) {
        console.log(error);
      } else {
        //인증번호 부여 성공
        console.log("db에 authstring 넣기 성공");
        //인증번호를 담은 메일 전송
        mailSendAuthEmail(email, authString, res);
      }
    });
  } else {
    return res
      .status(400)
      .json({ success: false, message: "이메일 형식이 유효하지 않습니다." });
  }
};

export const compareAuthEmail = (
  email: string,
  authString: string,
  res: Response<any, Record<string, any>, number>
) => {
  //db의 authString과
  //유저가 입력한 authString을 비교해서
  //같으면 인증 완료 (isAuth=1)
  if (checkEmail(email)) {
    dbSelectUserEmailAuth(email, function (success, error, dbAuthString) {
      if (!success) {
        return res.status(400).json({ success: false, message: error });
      }
      //부여된 인증번호가 없는 경우
      else if (!authString) {
        return res
          .status(404)
          .json({ success: false, message: "부여된 인증번호가 없습니다." });
      } else {
        //인증번호 동일
        if (dbAuthString === authString) {
          dbSuccessUserEmailAuth(email, function (success, error) {
            if (!success) {
              return res.status(400).json({ success: false, message: error });
            }
            //인증 성공
            return res.json({
              success: true,
            });
          });
        }
        //인증번호 동일 x
        else {
          return res.status(401).json({
            success: false,
            message: "인증번호가 일치하지 않습니다.",
          });
        }
      }
    });
  } else {
    return res
      .status(400)
      .json({ success: false, message: "이메일이 형식이 유효하지 않습니다." });
  }
};
