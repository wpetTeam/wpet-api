import { CreatePetModel, PetIDModel, PetInforDTO } from "../../types/pet";
import {
  createPet,
  deletePet,
} from "../../controllers/pet.controllers/create_delete_pet.controller";

import { PetRequest } from "../../types/express";
import { Router } from "express";
import { UserInforDTO } from "../../types/user";
import { auth } from "../../middleware/auth";
import { checkEmptyValue } from "../../controllers/validations/validate";

const router = Router();

/**
 * @swagger
 * paths:
 *   /pets:
 *     post:
 *        tags:
 *        - pets
 *        description: "반려견 생성하기"
 *        produces:
 *          - "application/json"
 *        requestBody:
 *          required: true
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/definitions/Pet_create_req"
 *        responses:
 *          "201":
 *            description: "반려견 생성 성공"
 *          "400":
 *            description: "INVALID FORMAT ERROR : 요청 값 형식이 유효하지 않음 / EXCEED MAX ERROR : 등록가능한 최대 반려견 수를 초과 (5마리)"
 *          "401":
 *            description: "AUTH FAILED: 사용자 인증 실패"
 *          "404":
 *            description: "SQL ERROR : DB 에러 / WRITE IMAGE FILE ERROR : 이미지 처리 중 에러 발생 (반환되는 경우 없어야함)"
 *          "409":
 *            description: "CONFLICT ERROR : 사용자가 등록한 다른 반려견의 이름과 중복됩니다."
 *        security:
 *          - petstore_auth:
 *              - "write:pets"
 *              - "read:pets"
 * definitions:
 *   Pet_create_req:
 *     type: object
 *     required:
 *       - name
 *       - birthDate
 *       - gender
 *       - photo
 *       - breeds
 *     properties:
 *       name:
 *         type: string
 *         description: 반려견 이름
 *         example: "흰둥이"
 *       birthDate:
 *         type: date
 *         description: 반려견 생년월일
 *         example: "2022-01-01"
 *       gender:
 *         type: string
 *         description: 반려견 성별
 *         example: "여"
 *       photo:
 *         type: string
 *         description: 반려견 사진
 *         example: "aaa"
 *       breeds:
 *         type: Array<string>
 *         description: 반려견 종 (1-3종)
 *         example: ["골든 리트리버", "가스코뉴"]
 */

router.post("/pets", auth, (req: PetRequest<CreatePetModel>, res) => {
  // 펫 등록 할때 필요한 정보들을 client에서 가져오면
  // 그것들을 데이터 베이스에 넣어준다.
  let user: UserInforDTO | null = req.user;

  if (user) {
    // 유저 인증 완료
    const pet: PetInforDTO = req.body;

    if (
      checkEmptyValue(pet.name) ||
      checkEmptyValue(pet.birthDate) ||
      checkEmptyValue(pet.gender) ||
      checkEmptyValue(pet.breeds)
    ) {
      return res.status(400).json({
        code: "INVALID FORMAT ERROR",
        errorMessage: "PARAMETER IS EMPTY",
      });
    }
    createPet(user.userID, pet, res);
  } else {
    // 유저 인증 no
    return res.status(401).json({
      code: "AUTH FAILED",
      errorMessage: "USER AUTH FAILED (COOKIE ERROR)",
    });
  }
});

router.delete("/pets/:petId", auth, (req, res) => {
  // petName에 해당하는 펫을 삭제
  let user: UserInforDTO | null = req.user;

  if (user) {
    // 유저 인증 완료
    const petID: number = Number(req.params.petId);
    if (checkEmptyValue(petID)) {
      return res.status(400).json({
        code: "INVALID FORMAT ERROR",
        errorMessage: "PARAMETER IS EMPTY",
      });
    }
    deletePet(user.userID, petID, res);
  } else {
    // 유저 인증 no
    return res.status(401).json({
      code: "AUTH FAILED",
      errorMessage: "USER AUTH FAILED (COOKIE ERROR)",
    });
  }
});

export default router;
