import { Router } from "express";
import { HttpError } from "../errors";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabaseAdmin";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (request, response, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", (request as AuthenticatedRequest).userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new HttpError(500, error.message);
    }

    response.json({ notifications: data ?? [] });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.put("/:id/read", requireAuth, async (request, response, next) => {
  try {
    const { id } = request.params;
    
    // Attempt to update only if the user_id matches
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", (request as AuthenticatedRequest).userId)
      .select("*")
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new HttpError(404, "Notification not found");
      }
      throw new HttpError(500, error.message);
    }

    response.json({ notification: data });
  } catch (error) {
    next(error);
  }
});
