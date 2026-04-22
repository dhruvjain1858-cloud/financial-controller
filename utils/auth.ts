import { supabase } from "@/lib/supabaseClient";

/**
 * Signs in the user using Google OAuth with a proper redirect URL for development and production.
 */
export const signInWithGoogle = async () => {
  const getURL = () => {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
      'http://localhost:3000/';
    
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`;
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
  };

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : getURL(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
};
