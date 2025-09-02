import express from 'express';
import { auth } from '../middlewares/auth.js';
import { generateArticle, generateBlogTitle } from '../controllers/aiController.js';

const aiRouter = express.Router();

aiRouter.post('/generate-article', auth, generateArticle)
aiRouter.post('/generate-blog-title', auth, generateBlogTitle)

export default aiRouter;
