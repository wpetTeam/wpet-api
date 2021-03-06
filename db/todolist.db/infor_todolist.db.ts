import {
  InforPetTodolistDTO,
  UpdateTodolistReqDTO,
} from "../../types/todolist";

import { MysqlError } from "mysql";
import mql from "../mysql/mysql";

// 해당 투두리스트가 반려견의 것이 맞는지 검증
export function dbCheckPetTodolist(
  petID: number,
  todolistID: number,
  callback: (
    success: boolean,
    error: MysqlError | null,
    message?: string
  ) => void
): any {
  let sql: string = `SELECT * FROM todolisttbl WHERE todoListID=? AND petID=?`;

  return mql.query(sql, [todolistID, petID], (err, row) => {
    if (err) callback(false, err);
    // 투두리스트가 반려견의 것이 맞는 경우
    else if (row.length > 0) callback(true, null);
    // 아닌 경우
    else callback(false, null, "TODOLIST NOT FOUND");
  });
}

// 해당 투두리스트의 키워드 가져오기
export function dbSelectTodolistKeyword(
  todolistID: number,
  callback: (
    success: boolean,
    error: MysqlError | null,
    keyword?: string
  ) => void
): any {
  let sql: string = `SELECT todolistkeywordtbl.keyword 
                      FROM todolisttbl,todolistkeywordtbl
                      WHERE todolisttbl.todoListID=?
                      AND todolisttbl.todoListKeywordID = todolistkeywordtbl.todoListKeywordID`;

  return mql.query(sql, [todolistID], (err, row) => {
    if (err) callback(false, err);
    // 투두리스트가 반려견의 것이 맞는 경우
    else callback(true, null, row[0].keyword);
  });
}

// 투두리스트 완료 (체크 update)
export function dbUpdateTodolistCheck(
  todolistID: number,
  isCheck: number,
  callback: (
    success: boolean,
    error: MysqlError | null,
    keyword?: string
  ) => void
): any {
  let sql1: string = `UPDATE todolisttbl SET isCheck=${isCheck} WHERE todoListID=${todolistID};`; // CHECK UPDATE
  // check UPDATE
  return mql.query(sql1, (err, row) => {
    if (err) callback(false, err);
    else {
      let sql2: string = `SELECT todolistkeywordtbl.keyword FROM todolisttbl,todolistkeywordtbl 
                          WHERE todolisttbl.todoListID=${todolistID} 
                          AND todolisttbl.todoListKeywordID=todolistkeywordtbl.todoListKeywordID;`; // SELECT KEYWORD
      // 키워드 가져오기
      mql.query(sql2, (err, row) => {
        if (err) callback(false, err);
        else callback(true, null, row[0].keyword);
      });
    }
  });
}

// 투두리스트 수정
export function dbUpdateTodolistInfo(
  todolistID: number,
  updateInfo: UpdateTodolistReqDTO,
  callback: (success: boolean, error?: MysqlError) => void
): any {
  let sql: string = `UPDATE todolisttbl as B, (SELECT todoListKeywordID, keyword FROM todolistkeywordtbl) as A 
                      SET B.date=?, B.content=?, B.time=?, B.todoListKeywordID=A.todoListKeywordID 
                      WHERE B.todoListID=? AND A.keyword=?`;

  return mql.query(
    sql,
    [
      updateInfo.date,
      updateInfo.content,
      updateInfo.time,
      todolistID,
      updateInfo.keyword,
    ],
    (err, row) => {
      if (err) callback(false, err);
      else callback(true);
    }
  );
}

// 사용자가 등록한 반려견들의 투두리스트 가져오기 (오늘, 내일)
export function dbSelectUserPetsTodolistsInfo(
  petIDs: Array<number>,
  callback: (
    success: boolean,
    error: MysqlError | null,
    result?: Array<any>,
    today?: string,
    tomorrow?: string
  ) => void
): any {
  let petNum: number = petIDs.length;
  // 오늘, 내일 따로 구하기
  // 오늘 투두리스트
  let sql: string = `SELECT todolisttbl.todoListID, todolisttbl.petID, todolisttbl.date, todolisttbl.content,
                      todolisttbl.time, todolisttbl.isCheck, todolistkeywordtbl.keyword 
                      FROM todolisttbl, todolistkeywordtbl 
                      WHERE todolisttbl.todoListKeywordID=todolistkeywordtbl.todoListKeywordID AND 
                      (todolisttbl.date=CURDATE() OR todolisttbl.date=CURDATE()+INTERVAL 1 DAY) AND 
                      (todolisttbl.petID=?`;

  for (let i = 0; i < petNum - 1; i++) {
    sql += " OR todolisttbl.petID=?";
  }
  sql += ")";
  return mql.query(sql, petIDs, (err, row) => {
    if (err) callback(false, err);
    else {
      let today: Date = new Date();
      let todayYear: number = today.getFullYear();
      let todayMonth: string = ("0" + (today.getMonth() + 1)).slice(-2);
      let todayDay: string = ("0" + today.getDate()).slice(-2);
      let todayDateString: string =
        todayYear + "-" + todayMonth + "-" + todayDay;

      let tomorrow: Date = new Date(today.setDate(today.getDate() + 1));
      let tomorrowYear: number = tomorrow.getFullYear();
      let tomorrowMonth: string = ("0" + (tomorrow.getMonth() + 1)).slice(-2);
      let tomorrowDay: string = ("0" + tomorrow.getDate()).slice(-2);
      let tomorrowDateString: string =
        tomorrowYear + "-" + tomorrowMonth + "-" + tomorrowDay;

      let resultObj: any = {};
      let todolistLen: number = row.length;
      // 사용자의 반려견 ID
      for (let i = 0; i < petNum; i++) {
        // 출력 결과 투두리스트의 반려견 ID
        resultObj[petIDs[i]] = {
          todays: [],
          tomorrows: [],
        };
      }

      for (let j = 0; j < todolistLen; j++) {
        // 오늘 투두리스트
        if (row[j].date == todayDateString)
          resultObj[row[j].petID]["todays"].push(row[j]);
        // 내일 투두리스트
        else resultObj[row[j].petID]["tomorrows"].push(row[j]);
      }
      callback(true, null, resultObj, todayDateString, tomorrowDateString);
    }
  });
}

// 반려견의 투두리스트 가져오기 (년-월)
export function dbSelectPetTodolistsInfo(
  petID: number,
  year: number,
  month: string,
  callback: (
    success: boolean,
    error: MysqlError | null,
    result?: Array<InforPetTodolistDTO>
  ) => void
): any {
  let sql: string = `SELECT todolisttbl.todoListID, todolisttbl.petID, todolisttbl.date, todolisttbl.content,
                      todolisttbl.time, todolisttbl.isCheck, todolistkeywordtbl.keyword 
                      FROM todolisttbl, todolistkeywordtbl 
                      WHERE todolisttbl.petID=? AND todolisttbl.todoListKeywordID=todolistkeywordtbl.todoListKeywordID AND 
                      DATE_FORMAT(todolisttbl.date, '%Y-%m') = '?-${month}' ORDER BY todolisttbl.date`;
  return mql.query(sql, [petID, year], (err, row) => {
    if (err) callback(false, err);
    else callback(true, null, row);
  });
}
