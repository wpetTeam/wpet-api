import { Response } from "express-serve-static-core";
import ejs from "ejs";
import nodemailer from "nodemailer";
import path from "path";

// var appDir = path.dirname(require.main.filename);

export const mailSendAuthEmail = (
  email: string,
  authString: string,
  res: Response<any, Record<string, any>, number>
) => {
  //이메일 주소로 인증메일을 보내고
  //인증 번호

  let emailTemplete;
  ejs.renderFile(
    path.join(__dirname, "..", "/../template/sendAuthMail.ejs"),
    { authCode: authString },
    async function (err, data) {
      if (err) {
        return res
          .status(404)
          .json({ code: "FIND MAIL FILE ERROR", errorMessage: err });
      }

      emailTemplete = data;

      let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      });
      await transporter.sendMail(
        {
          from: process.env.NODEMAILER_USER,
          to: email,
          subject: "[WPET] 회원가입을 위한 인증번호를 입력해주세요.",
          html: emailTemplete,
        },
        (error, info) => {
          if (error) {
            return res
              .status(404)
              .json({ code: "SEND MAIL ERROR", errorMessage: error });
          }

          // res.send(authNum);
          //? 전송을 끝내는 메소드
          transporter.close();
          return res.status(201).json({
            success: true,
          });
        }
      );
    }
  );
};

export const mailSendAuthUpdateEmail = (
  email: string,
  authString: string,
  res: Response<any, Record<string, any>, number>
) => {
  //이메일 주소로 인증메일을 보내고
  //인증 번호

  let emailTemplete;
  ejs.renderFile(
    path.join(__dirname, "..", "/../template/sendAuthUpdateMail.ejs"),
    { authCode: authString },
    async function (err, data) {
      if (err) {
        return res
          .status(404)
          .json({ code: "FIND MAIL FILE ERROR", errorMessage: err });
      }

      emailTemplete = data;

      let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      });
      await transporter.sendMail(
        {
          from: process.env.NODEMAILER_USER,
          to: email,
          subject:
            "[WPET] 회원님의 새로운 이메일을 위한 인증번호를 입력해주세요.",
          html: emailTemplete,
        },
        (error, info) => {
          if (error) {
            return res
              .status(404)
              .json({ code: "SEND MAIL ERROR", errorMessage: error });
          }

          // res.send(authNum);
          //? 전송을 끝내는 메소드
          transporter.close();
          return res.status(201).json({
            success: true,
          });
        }
      );
    }
  );
};

export const mailSendTempPw = (
  email: string,
  tempPw: string,
  res: Response<any, Record<string, any>, number>
) => {
  //이메일 주소로 임시 비밀번호 보내기

  let emailTemplete;
  ejs.renderFile(
    path.join(__dirname, "..", "/../template/sendTempPw.ejs"),
    { tempPw: tempPw },
    async function (err, data) {
      if (err) {
        return res
          .status(404)
          .json({ code: "FIND MAIL FILE ERROR", errorMessage: err });
      }

      emailTemplete = data;

      let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      });
      await transporter.sendMail(
        {
          from: process.env.NODEMAILER_USER,
          to: email,
          subject: "[WPET] 회원님의 임시 비밀번호가 발급되었습니다.",
          html: emailTemplete,
        },
        (error, info) => {
          if (error) {
            return res
              .status(404)
              .json({ code: "SEND MAIL ERROR", errorMessage: error });
          }

          // res.send(authNum);
          //? 전송을 끝내는 메소드
          transporter.close();
          return res.status(201).json({
            success: true,
          });
        }
      );
    }
  );
};
