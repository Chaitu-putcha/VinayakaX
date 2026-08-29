"use client";

import { useEffect, useState } from "react";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("fullName") || "";
    const mail = localStorage.getItem("email") || "";

    setFullName(name);
    setEmail(mail);
    setRole(localStorage.getItem("role") || "");
    setPhotoUrl(localStorage.getItem("profileImageUrl") || null);

    setNewName(name);
    setNewEmail(mail);
  }, []);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch("https://vinayakax-backend.onrender.com/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: newName,
          email: newEmail,
        }),
      });

      if (!response.ok) {
        alert("Profile update failed");
        return;
      }

      const data = await response.json();

      setFullName(data.full_name);
      setEmail(data.email);

      localStorage.setItem("fullName", data.full_name);
      localStorage.setItem("email", data.email);

      setEditing(false);

      alert("✅ Profile updated successfully!");

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://vinayakax-backend.onrender.com/api/profile/photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.detail || "Photo upload failed");
        return;
      }

      const data = await response.json();

      setPhotoUrl(data.profile_image_url || null);

      localStorage.setItem("profileImageUrl", data.profile_image_url || "");

      window.dispatchEvent(new Event("profile-photo-updated"));

      setPhotoSuccessMsg("✅ Profile photo updated!");
      setTimeout(() => setPhotoSuccessMsg(""), 3000);
    } catch (error) {
      console.error(error);
      alert("Something went wrong uploading the photo");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("New Password and Confirm Password do not match");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("https://vinayakax-backend.onrender.com/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Password change failed");
        return;
      }

      alert("✅ Password changed successfully!");

      setChangingPassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="rounded-2xl bg-white dark:bg-stone-900 shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        <div className="flex items-center gap-4 mb-8">
          <ProfileAvatar photoUrl={photoUrl} name={fullName} sizeClassName="h-20 w-20" />

          <div>
            <label className="inline-block cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              {uploadingPhoto ? "Uploading..." : "Change Photo"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>

            <p className="text-xs text-gray-500 mt-1">JPG, PNG or WEBP, under 5MB</p>

            {photoSuccessMsg && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium animate-pulse">
                {photoSuccessMsg}
              </p>
            )}
          </div>
        </div>

        {changingPassword && (
          <div className="border rounded-xl p-6 mb-6 space-y-4">
            <div>
              <label className="block mb-2">Old Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
              />
            </div>

            <div>
              <label className="block mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
              />
            </div>

            <div>
              <label className="block mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleChangePassword}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
              >
                Save Password
              </button>

              <button
                onClick={() => setChangingPassword(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {editing ? (
          <div className="border rounded-xl p-6 space-y-4">
            <div>
              <label className="block mb-2 font-medium">Full Name</label>

              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Email</label>

              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
              >
                Save
              </button>

              <button
                onClick={() => setEditing(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              <div>
                <p className="text-gray-500">Full Name</p>
                <h2 className="text-xl font-semibold">{fullName}</h2>
              </div>

              <div>
                <p className="text-gray-500">Email</p>
                <h2 className="text-xl font-semibold">{email}</h2>
              </div>

              <div>
                <p className="text-gray-500">Role</p>
                <h2 className="text-xl font-semibold">{role}</h2>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setEditing(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
              >
                Edit Profile
              </button>

              <button
                onClick={() => setChangingPassword(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Change Password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}