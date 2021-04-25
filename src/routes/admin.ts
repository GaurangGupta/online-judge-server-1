import express from "express";
import { body } from "express-validator";
import { UserModel } from "../models";
import { AuthorizedReq } from "../types";
import { validate } from "../validate";
const router = express.Router();

router.post("/make-instructor", body("email").isEmail(), validate, async function (req: AuthorizedReq, res) {
  const user = await UserModel.findOne({ email: req.body.email });
  if (!user) {
    return res.json({
      errors: [{ message: `User with email ${req.body.email} does not exist` }],
    });
  }

  UserModel.findOneAndUpdate(
    { email: req.body.email },
    {
      $set: {
        is_instructor: true,
      },
    },
    undefined,
    (err, doc) => {
      if (err) {
        return res.json({ errors: [err] });
      }
      return res.json(doc);
    }
  );
});

router.get(
  "/stats/users",
  body("days").exists,
  validate,
  async function (req: AuthorizedReq, res: { json: (arg0: any[]) => any }) {
    var days = req.body.days;
    if (days == undefined) days = 6;
    var now = new Date();
    var old_time = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    var pipeline = [
      {
        $match: {
          created_at: {
            $gte: old_time,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" },
          },
          count: { $sum: 1 },
        },
      },
    ];

    UserModel.aggregate(pipeline, function (result: any[]) {
      result.sort(function (
        date1: { _id: { year: number; month: number; day: number } },
        date2: { _id: { year: number; month: number; day: number } }
      ) {
        if (date1._id.year < date2._id.year) {
          return -1;
        } else if (date1._id.year > date2._id.year) {
          return 1;
        }
        if (date1._id.month < date2._id.month) {
          return -1;
        } else if (date1._id.month > date2._id.month) {
          return 1;
        }
        if (date1._id.day < date2._id.day) {
          return -1;
        } else if (date1._id.day > date2._id.day) {
          return 1;
        }
        return 0;
      });

      var daywise_data = [];
      for (var i = 0; i < result.length; i++) {
        daywise_data.push(result[i].count);
      }
      return res.json(daywise_data);
    });
  }
);

export default router;
