/**
 * Shared helper for uploading/removing the logged-in user's profile photo.
 *
 * Import this from your existing Edit Profile component — don't rebuild
 * the upload logic there. See the usage snippet in
 * edit_profile_integration.md for the exact 3-line wiring.
 */

const API = "http://localhost:8000";

export interface ProfileUploadResult {
  profile_image_url: string | null;
  full_name: string;
  email: string;
  id: number;
  role: string;
  [key: string]: unknown;
}

/**
 * Uploads a new profile photo for the currently logged-in user.
 * On success: updates localStorage("profileImageUrl") and fires the
 * "profile-photo-updated" event so Navbar.tsx / MobileTopNavbar.tsx
 * (already listening for it) update immediately without a page refresh.
 */
export async function uploadProfilePhoto(file: File): Promise<ProfileUploadResult> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("You must be logged in to update your profile photo.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API}/api/profile/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type: browser sets the multipart boundary
    body: formData,
  });

  if (!response.ok) {
    let detail = "Failed to upload photo. Please try again.";
    try {
      const errBody = await response.json();
      if (errBody?.detail) detail = errBody.detail;
    } catch {
      // ignore parse failure, use default message
    }
    throw new Error(detail);
  }

  const data: ProfileUploadResult = await response.json();

  localStorage.setItem("profileImageUrl", data.profile_image_url || "");
  window.dispatchEvent(new Event("profile-photo-updated"));

  return data;
}

/** Removes the current photo, falling back to initials/UserCircle. */
export async function removeProfilePhoto(): Promise<ProfileUploadResult> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("You must be logged in to update your profile photo.");
  }

  const response = await fetch(`${API}/api/profile/photo`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to remove photo. Please try again.");
  }

  const data: ProfileUploadResult = await response.json();

  localStorage.removeItem("profileImageUrl");
  window.dispatchEvent(new Event("profile-photo-updated"));

  return data;
}