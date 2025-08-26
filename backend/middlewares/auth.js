//middleware to check userID & hasPremiumPlan

import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
    try {
        const {userId, has} = await req.auth();
        const hasPremiumPlan = await has({plan: 'premium'});

        const user = await clerkClient.users.getUser(userId);
        const usage = user.privateMetadata.free_usage;

        if (!hasPremiumPlan && typeof usage === 'number') {
            req.free_usage = usage;
        } else if (!hasPremiumPlan) {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: 0
                }
            })
            req.free_usage = 0;
        } else {
            req.free_usage = 0;
        }
        req.plan = hasPremiumPlan ? 'premium' : 'free';
        next()
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}