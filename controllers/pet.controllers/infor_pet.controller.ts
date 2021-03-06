import {
  checkDate,
  checkName,
  checkPetSpecies,
  checkPetWeight,
  checkSex,
} from "../validations/validate";
import {
  dbCheckPetExist,
  dbCheckPetName,
  dbCheckPetSpecies,
} from "../../db/pet.db/create_delete_pet.db";
import {
  dbDeletePictureFile,
  dbSelectPictureFile,
  dbSelectPictureFiles,
  imageController,
} from "../image.controllers/image.controller";
import {
  dbSelectPetProfilePictureUrl,
  dbSelectPetSpecies,
  dbSelectPets,
  dbUpdatePetInfor,
  dbUpdatePetInfors,
  dbUpdatePetSpecies,
} from "../../db/pet.db/infor_pet.db";
import {
  updatePetBirthDate,
  updatePetName,
  updatePetProfilePicture,
  updatePetSex,
  updatePetSpecies,
  updatePetWeight,
} from "./update_pet.controller";

import { MysqlError } from "mysql";
import { Response } from "express-serve-static-core";
import { UpdatePetInforDTO } from "../../types/pet";

export const getUserPets = (
  userID: number,
  res: Response<any, Record<string, any>, number>
) => {
  // userID의 사용자가 등록한 pet들 정보 (petID, petName) return
  dbSelectPets(userID, function (success, result, err) {
    if (!success) {
      return res.status(404).json({ code: "SQL ERROR", errorMessage: err });
    } else if (result !== null && result.length > 0) {
      // 출력 성공
      let petLen: number = result.length;
      let petPhotos: Array<string | null> = result.map((pet) => pet.photo);

      // pet 사진url -> 파일안의 데이터 가져오기
      dbSelectPictureFiles(
        petPhotos,
        function (success, diaryPictureDatas, err) {
          if (!success) {
            return res.status(404).json({
              code: "FIND IMAGE FILE ERROR",
              errorMessage: err,
            });
          } else if (diaryPictureDatas !== null) {
            // 파일에서 이미지 데이터 가져오기 성공 (array)
            if (petPhotos.length !== diaryPictureDatas.length)
              return res.status(404).json({
                code: "FIND IMAGE FILE ERROR",
                errorMessage: "IMAGE FILES NOT FOUND",
              });
            for (let i = 0; i < petLen; i++) {
              result[i].photo = diaryPictureDatas[i];
            }
            return res.json({ result });
          }
        }
      );
    } else return res.json({ result });
  });
};

export const getPetInfor = (
  userID: number,
  petID: number,
  res: Response<any, Record<string, any>, number>
) => {
  // userID의 유저가 등록한 pet 한마리 정보 return

  // userID의 유저가 등록한 pet들 중 pet 존재하는지 검증
  dbCheckPetExist(userID, petID, function (success, result, err, msg) {
    if (!success && err) {
      return res.status(404).json({ code: "SQL ERROR", errorMessage: err });
    }
    // 사용자에게 해당 이름의 pet이 존재하지 않는 경우
    else if (!success && !err) {
      return res.status(404).json({ code: "NOT FOUND", errorMessage: msg });
    }
    // pet이 존재하는 경우
    // 그 pet의 정보 (pettbl + speciestbl) return
    else if (result) {
      // pet 사진url -> 파일안의 데이터 가져오기
      dbSelectPictureFile(
        result.photo,
        function (success, petProfilePictureData, error, msg) {
          if (!success && error) {
            return res
              .status(404)
              .json({ code: "FIND IMAGE FILE ERROR", errorMessage: error });
          }
          // 파일이 없는 경우
          else if (!success && !error) {
            return res
              .status(404)
              .json({ code: "NOT FOUND", errorMessage: msg });
          }
          // 파일에서 이미지 데이터 가져오기 성공
          else {
            result.photo = petProfilePictureData;
            res.json({ result });
          }
        }
      );
    }
  });
};

export const updatePetInfor = (
  userID: number,
  petID: number,
  updateInfor: UpdatePetInforDTO,
  res: Response<any, Record<string, any>, number>
) => {
  // userID의 유저가 등록한 pet 한마리 정보 수정 (weight 포함)

  // userID의 유저가 등록한 pet들 중 pet 존재하는지 검증
  dbCheckPetExist(userID, petID, function (success, result, err, msg) {
    if (!success && err) {
      return res.status(404).json({ code: "SQL ERROR", errorMessage: err });
    }
    // 사용자에게 해당 이름의 pet이 존재하지 않는 경우
    else if (!success && !err) {
      return res.status(404).json({ code: "NOT FOUND", errorMessage: msg });
    } else if (result) {
      // pet이 존재하는 경우
      // param 유효성 검증
      let rightKeys: Array<string> = [
        "name",
        "birthDate",
        "gender",
        "weight",
        "photo",
        "breeds",
      ];
      let patchValue: any;
      let patchKeys: Array<string> = Object.keys(updateInfor);
      let patchLength: number = patchKeys.length;
      let isInvalidKey: boolean = false;
      let originProfilePictureUrl: string | null = null;
      // db에 한번에 넣을 떄 이용
      let patchAtributes: Array<string> = [];

      //key가 하나 이상이라면
      if (patchLength < 1 || patchLength > 6) {
        return res.status(400).json({
          code: "INVALID FORMAT ERROR",
          errorMessage: "NUMBER OF KEYS : 1-6",
        });
      } else {
        // 이상한 key 있는지 검사
        for (let i = 0; i < patchLength; i++) {
          // 예외 값 존재
          if (rightKeys.indexOf(patchKeys[i]) === -1) {
            isInvalidKey = true;
            break;
          }
        }
        if (isInvalidKey)
          return res.status(400).json({
            code: "INVALID FORMAT ERROR",
            errorMessage: "INVALID KEY INCLUDED",
          });
        else {
          let errObj: any = {
            invalidFormat: [],
            duplication: [],
            sqlErr: [],
          };
          //petName 수정
          updatePetName(userID, petID, result.name, updateInfor["name"], res)
            .then((param: any) => {
              let resultStatusCode: number = param[0];
              let resultMsg: string | MysqlError = param[1];
              // 값 동일
              if (resultStatusCode === 204) {
                // name key 제거
                delete updateInfor.name;
              } else if (resultStatusCode === 400)
                errObj["invalidFormat"].push(resultMsg);
              else if (resultStatusCode === 404)
                errObj["sqlErr"].push(resultMsg);
              else if (resultStatusCode === 409)
                errObj["duplication"].push(resultMsg);

              updatePetBirthDate(
                petID,
                result.birthDate,
                updateInfor["birthDate"],
                res
              )
                .then((param: any) => {
                  resultStatusCode = param[0];
                  resultMsg = param[1];
                  // 값 동일
                  if (resultStatusCode === 204) {
                    // name key 제거
                    delete updateInfor.birthDate;
                  } else if (resultStatusCode === 400)
                    errObj["invalidFormat"].push(resultMsg);

                  updatePetSex(petID, result.gender, updateInfor["gender"], res)
                    .then((param: any) => {
                      resultStatusCode = param[0];
                      resultMsg = param[1];
                      // 값 동일
                      if (resultStatusCode === 204) {
                        // name key 제거
                        delete updateInfor.gender;
                      } else if (resultStatusCode === 400)
                        errObj["invalidFormat"].push(resultMsg);

                      // weight == null일 수 ㅇㅇ
                      updateInfor["weight"] =
                        updateInfor["weight"] === 0
                          ? null
                          : updateInfor["weight"];
                      updatePetWeight(
                        petID,
                        result.weight,
                        updateInfor["weight"],
                        res
                      )
                        .then((param: any) => {
                          resultStatusCode = param[0];
                          resultMsg = param[1];
                          // 값 동일
                          if (resultStatusCode === 204) {
                            // name key 제거
                            delete updateInfor.weight;
                          } else if (resultStatusCode === 400)
                            errObj["invalidFormat"].push(resultMsg);

                          updatePetProfilePicture(
                            petID,
                            result.photo,
                            updateInfor["photo"],
                            res
                          )
                            .then((param: any) => {
                              resultStatusCode = param[0];
                              resultMsg = param[1];
                              // 값 동일
                              if (resultStatusCode === 204) {
                                // name key 제거
                                delete updateInfor.photo;
                              } else if (resultStatusCode === 404)
                                errObj["sqlErr"].push(resultMsg);
                              else if (
                                resultStatusCode === 201 &&
                                typeof resultMsg === "string"
                              )
                                originProfilePictureUrl = resultMsg;
                              updatePetSpecies(
                                petID,
                                result.breeds,
                                updateInfor["breeds"],
                                res
                              )
                                .then((param: any) => {
                                  resultStatusCode = param[0];
                                  resultMsg = param[1];
                                  // 값 동일
                                  if (resultStatusCode === 204) {
                                    // name key 제거
                                    delete updateInfor.breeds;
                                  } else if (resultStatusCode === 400)
                                    errObj["invalidFormat"].push(resultMsg);
                                  else if (resultStatusCode === 404)
                                    errObj["sqlErr"].push(resultMsg);

                                  // 데이터 삽입
                                  let resultKeys: Array<string> =
                                    Object.keys(updateInfor);

                                  // 모든 key들이 수정 전과 동일한 경우 (204) (수정?)
                                  if (resultKeys.length === 0) {
                                    return res.status(204).json({
                                      code: "CONFLICT ERROR",
                                      errorMessage:
                                        "SAME OLD AND NEW PET'S INFO",
                                    });
                                  } else if (
                                    errObj["invalidFormat"].length > 0 ||
                                    errObj["duplication"].length > 0 ||
                                    errObj["sqlErr"].length > 0
                                  ) {
                                    return res.status(400).json({
                                      code: "INVALID FORMAT ERROR",
                                      errorMessage: errObj,
                                    });
                                  } else {
                                    // 남은 속성들 (기존 값과 다른 속성들) UPDATE
                                    let photoBreedsInfor: any = {};
                                    if ("photo" in updateInfor)
                                      photoBreedsInfor["photo"] =
                                        updateInfor["photo"];
                                    if ("breeds" in updateInfor)
                                      photoBreedsInfor["breeds"] =
                                        updateInfor["breeds"];

                                    delete updateInfor.photo;
                                    delete updateInfor.breeds;

                                    resultKeys = Object.keys(updateInfor);
                                    console.log("updateInfor: ", updateInfor);
                                    console.log(
                                      "photoBreedsInfor: ",
                                      photoBreedsInfor
                                    );
                                    dbUpdatePetInfors(
                                      petID,
                                      resultKeys,
                                      updateInfor,
                                      function (success, err) {
                                        if (!success) {
                                          return res.status(404).json({
                                            code: "SQL ERROR",
                                            errorMessage: err,
                                          });
                                        }
                                        // update 성공
                                        // 사진 UPDATE
                                        else if ("photo" in photoBreedsInfor) {
                                          // update 성공
                                          // 사진 UPDATE

                                          dbDeletePictureFile(
                                            originProfilePictureUrl,
                                            function (success, error) {
                                              if (!success) {
                                                return res.status(404).json({
                                                  code: "PARTIALLY UPDATE SUCCEED, DELETE IMAGE FILE ERROR",
                                                  errorMessage: error,
                                                });
                                              }
                                              // 파일 삭제 완료
                                              // 수정할 이미지 데이터 -> 새로운 파일에 삽입
                                              // 이미지 파일 컨트롤러
                                              else if (
                                                photoBreedsInfor["photo"] !==
                                                undefined
                                              ) {
                                                photoBreedsInfor["photo"] =
                                                  photoBreedsInfor["photo"] ===
                                                  ""
                                                    ? null
                                                    : photoBreedsInfor["photo"];
                                                imageController(
                                                  photoBreedsInfor["photo"],
                                                  function (
                                                    success,
                                                    imageFileUrl,
                                                    error
                                                  ) {
                                                    if (!success) {
                                                      return res
                                                        .status(404)
                                                        .json({
                                                          code: "PARTIALLY UPDATE SUCCEED, WRITE IMAGE FILE ERROR",
                                                          errorMessage: error,
                                                        });
                                                    } else {
                                                      // 파일 생성 완료 (imageFileUrl : 이미지 파일 저장 경로) -> DB 저장
                                                      photoBreedsInfor[
                                                        "photo"
                                                      ] = imageFileUrl;
                                                      console.log(
                                                        photoBreedsInfor[
                                                          "photo"
                                                        ]
                                                      );
                                                      dbUpdatePetInfor(
                                                        petID,
                                                        "photo",
                                                        photoBreedsInfor[
                                                          "photo"
                                                        ],
                                                        function (
                                                          success,
                                                          err
                                                        ) {
                                                          if (!success) {
                                                            return res
                                                              .status(404)
                                                              .json({
                                                                code: "PARTIALLY UPDATE SUCCEED, SQL ERROR",
                                                                errorMessage:
                                                                  err,
                                                              });
                                                          }
                                                          //update 성공
                                                          // 종 UPDATE
                                                          else if (
                                                            photoBreedsInfor[
                                                              "breeds"
                                                            ]
                                                          ) {
                                                            dbUpdatePetSpecies(
                                                              petID,
                                                              photoBreedsInfor[
                                                                "breeds"
                                                              ],
                                                              function (
                                                                success,
                                                                err,
                                                                msg
                                                              ) {
                                                                if (
                                                                  !success &&
                                                                  err
                                                                ) {
                                                                  return res
                                                                    .status(404)
                                                                    .json({
                                                                      code: "PARTIALLY UPDATE SUCCEED, SQL ERROR",
                                                                      errorMessage:
                                                                        err,
                                                                    });
                                                                } else if (
                                                                  !success &&
                                                                  !err
                                                                ) {
                                                                  return res
                                                                    .status(404)
                                                                    .json({
                                                                      code: "PARTIALLY UPDATE SUCCEED, UPDATE BREEDS ERROR",
                                                                      errorMessage:
                                                                        msg,
                                                                    });
                                                                }
                                                                //update 성공
                                                                else {
                                                                  return res
                                                                    .status(201)
                                                                    .json({
                                                                      success:
                                                                        true,
                                                                    });
                                                                }
                                                              }
                                                            );
                                                          } else {
                                                            return res
                                                              .status(201)
                                                              .json({
                                                                success: true,
                                                              });
                                                          }
                                                        }
                                                      );
                                                    }
                                                  }
                                                );
                                              }
                                            }
                                          );
                                        }
                                        // 종 UPDATE
                                        else if (photoBreedsInfor["breeds"]) {
                                          dbUpdatePetSpecies(
                                            petID,
                                            photoBreedsInfor["breeds"],
                                            function (success, err, msg) {
                                              if (!success && err) {
                                                return res.status(404).json({
                                                  code: "PARTIALLY UPDATE SUCCEED, SQL ERROR",
                                                  errorMessage: err,
                                                });
                                              } else if (!success && !err) {
                                                return res.status(404).json({
                                                  code: "PARTIALLY UPDATE SUCCEED, UPDATE BREEDS ERROR",
                                                  errorMessage: msg,
                                                });
                                              }
                                              //update 성공
                                              else {
                                                return res.status(201).json({
                                                  success: true,
                                                });
                                              }
                                            }
                                          );
                                        } else {
                                          return res.status(201).json({
                                            success: true,
                                          });
                                        }
                                      }
                                    );
                                  }
                                })
                                .catch((err) => {
                                  console.log(err);
                                });
                            })
                            .catch((err) => {
                              console.log(err);
                            });
                        })
                        .catch((err) => {
                          console.log(err);
                        });
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                })
                .catch((err) => {
                  console.log(err);
                });
            })
            .catch((err) => {
              console.log(err);
            });
        }
      }
    }
  });
};

export const getAllSpecies = (
  res: Response<any, Record<string, any>, number>
) => {
  // DB에 저장된 모든 반려견 종들 가져오기
  dbSelectPetSpecies(function (success, result, err) {
    if (!success) {
      return res.status(404).json({ code: "SQL ERROR", errorMessage: err });
    }
    // 출력 성공
    else if (result) {
      let speciesArr: Array<string> = result.map((x) => x.petSpeciesName);
      return res.json({ result: speciesArr });
    }
  });
};
