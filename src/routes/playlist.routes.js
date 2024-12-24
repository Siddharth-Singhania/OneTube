import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";


const router = Router();

router.use(verifyJWT)

router.route("/").post(createPlaylist);
router.route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router.route("/add/:videoId/:plalistId").patch(addVideoToPlaylist)
router.route("/remove/:videoId/:plalistId").patch(removeVideoFromPlaylist)
router.route("/user/:userId").get(getUserPlaylists);


export default router
