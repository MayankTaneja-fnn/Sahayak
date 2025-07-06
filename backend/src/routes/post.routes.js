import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { handleSubmitIssue ,getAllPosts,acceptHelp,markResolved, responderMarkResolved} from "../controllers/post.controller.js";
const router = Router();

router.post(
  "/submitIssue",
  verifyToken,
  upload.fields([
    { name: "media", maxCount: 10 },
    { name: "voice", maxCount: 5 },
  ]),
  handleSubmitIssue
);

router.get("/posts",verifyToken, getAllPosts);
router.post("/:id/accept",verifyToken, acceptHelp)
router.post("/:id/resolve",verifyToken, markResolved)
router.post('/:id/responder-resolve', verifyToken, responderMarkResolved);

export default router;