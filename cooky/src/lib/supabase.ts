import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getSessionId(): string {
  let sessionId = localStorage.getItem('cooky_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('cooky_session_id', sessionId);
  }
  return sessionId;
}

export interface Bookmark {
  id: string;
  recipe_id: string;
  session_id: string;
  created_at: string;
  notes: string | null;
}

export async function getBookmarks(sessionId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase
    .from('recipe_bookmarks')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }

  return data || [];
}

export async function addBookmark(recipeId: string, sessionId: string): Promise<boolean> {
  // Check if bookmark already exists
  const { data: existing } = await supabase
    .from('recipe_bookmarks')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    console.log('Bookmark already exists, skipping insert');
    return true; // Already exists, consider it a success
  }

  const { error } = await supabase
    .from('recipe_bookmarks')
    .insert({
      recipe_id: recipeId,
      session_id: sessionId,
      notes: null
    });

  if (error) {
    console.error('Error adding bookmark:', error);
    return false;
  }

  return true;
}

export async function removeBookmark(recipeId: string, sessionId: string): Promise<boolean> {
  console.log('removeBookmark called with:', { recipeId, sessionId });

  const { data, error, count } = await supabase
    .from('recipe_bookmarks')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('session_id', sessionId)
    .select();

  console.log('removeBookmark response:', { data, error, count });

  if (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }

  return true;
}

export async function isBookmarked(recipeId: string, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('recipe_bookmarks')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Error checking bookmark:', error);
    return false;
  }

  return !!data;
}

export interface TriedRecipe {
  id: string;
  recipe_id: string;
  session_id: string;
  created_at: string;
}

export async function getTriedRecipes(sessionId: string): Promise<TriedRecipe[]> {
  const { data, error } = await supabase
    .from('tried_recipes')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tried recipes:', error);
    return [];
  }

  return data || [];
}

export async function markRecipeAsTried(recipeId: string, sessionId: string): Promise<boolean> {
  // Check if recipe is already marked as tried
  const { data: existing } = await supabase
    .from('tried_recipes')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    console.log('Recipe already marked as tried, skipping insert');
    return true; // Already exists, consider it a success
  }

  const { error } = await supabase
    .from('tried_recipes')
    .insert({
      recipe_id: recipeId,
      session_id: sessionId
    });

  if (error) {
    console.error('Error marking recipe as tried:', error);
    return false;
  }

  return true;
}

export async function unmarkRecipeAsTried(recipeId: string, sessionId: string): Promise<boolean> {
  console.log('unmarkRecipeAsTried called with:', { recipeId, sessionId });

  const { data, error, count } = await supabase
    .from('tried_recipes')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('session_id', sessionId)
    .select();

  console.log('unmarkRecipeAsTried response:', { data, error, count });

  if (error) {
    console.error('Error unmarking recipe:', error);
    return false;
  }

  return true;
}
