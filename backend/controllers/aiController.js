import AI from "../configs/gemini.js";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { imageToDataUrl, removeTempFile } from "../utils/uploads.js";

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Limit reached. Upgrade to continue." });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: length,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 }
      });
    }

    res.json({ success: true, content });

  } catch (error) {
    console.error("Error in generateArticle:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Limit reached. Upgrade to continue." });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${prompt}, ${content}, 'blog_title')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 }
      });
    }

    res.json({ success: true, content });

  } catch (error) {
    console.error("Error in generateBlogTitle:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish, size, steps, cfg_scale } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions.",
      });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;

    const payload = {
      prompt,
      size: size || "1024x1024",
      steps: steps || 20,
      cfg_scale: cfg_scale || 7,
      publish: publish ?? false
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    });

    const contentType = response.headers["content-type"] || "";
    const dataUrl = imageToDataUrl(response.data, contentType);

    let secure_url;
    try {
      const uploadResult = await cloudinary.uploader.upload(dataUrl);
      secure_url = uploadResult.secure_url;
    } catch (cloudErr) {
      console.error("Cloudinary upload failed:", cloudErr.message);
      return res.json({ success: true, content: dataUrl, warning: "Cloudinary upload failed. Returning generated image directly." });
    }

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish) 
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    res.json({
      success: true,
      content: secure_url,
      prompt,
      publish: publish ?? false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in generateImage:", error.message);
    res.json({ success: false, message: error.message || "Unknown error" });
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium" ) {
      return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
    }

    const {secure_url} = await cloudinary.uploader.upload(image.path, {
        transformation: [
            {
                effect: 'background_removal',
                background_removal: 'remove_the_background',
            }
        ]
    })

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${'Remove background from image'}, ${secure_url}, 'image')
    `;

    res.json({ success: true, content: secure_url });

  } catch (error) {
    console.error("Error in removeImageBackground:", error.message);
    res.json({ success: false, message: error.message });
  } finally {
    removeTempFile(req.file);
  }
};

export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium" ) {
      return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
    }

    const {public_id} = await cloudinary.uploader.upload(image.path)

    const imageUrl = cloudinary.url(public_id, {
        transformation: [{effect: `gen_remove:${object}`}],
        resource_type: 'image'
    })

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')
    `;

    res.json({ success: true, content: imageUrl });

  } catch (error) {
    console.error("Error in removeImageObject:", error.message);
    res.json({ success: false, message: error.message });
  } finally {
    removeTempFile(req.file);
  }
};

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium" ) {
      return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
    }

    if(resume.size > 5 * 1024 * 1024) {
        return res.json({ success: false, message: "Resume file size exceeds 5MB limit." });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer)

    const prompt = `Review the following resume and provide feedback on its structure, content, and areas for improvement. Resume Content:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume_review')
    `;

    res.json({ success: true, content });

  } catch (error) {
    console.error("Error in resumeReview:", error.message);
    res.json({ success: false, message: error.message });
  } finally {
    removeTempFile(req.file);
  }
};
