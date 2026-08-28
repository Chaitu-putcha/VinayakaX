"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");
const [otp, setOtp] = useState("");
const [showOTP, setShowOTP] = useState(false);
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [showReset, setShowReset] = useState(false);
const handleSendOTP = async () => {
  setLoading(true);
  setMessage("");

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/auth/forgot-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to send OTP");
    }

    setMessage("OTP sent successfully.");
    setShowOTP(true);
  } catch (err: any) {
    setMessage(err.message);
  } finally {
    setLoading(false);
  }
};
const handleVerifyOTP = async () => {
  setLoading(true);
  setMessage("");

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/auth/verify-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "OTP verification failed");
    }

    setMessage("OTP verified successfully.");
    setShowReset(true);
  } catch (err: any) {
    setMessage(err.message);
  } finally {
    setLoading(false);
  }
};
  const handleResetPassword = async () => {
  setLoading(true);
  setMessage("");

  try {
    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const response = await fetch(
      "http://127.0.0.1:8000/api/auth/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          new_password: newPassword,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Password reset failed");
    }

    setMessage("Password reset successfully.");
    setTimeout(() => {
        window.location.href = "/login";
    }, 2000);
    setShowReset(false);
    setShowOTP(false);

    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  } catch (err: any) {
    setMessage(err.message);
  } finally {
    setLoading(false);
  }
};  
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center">
          Forgot Password
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Enter your email to receive an OTP.
        </p>
        <div className="mt-6">
  <input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Enter your email"
  className="w-full rounded-lg border p-3 bg-stone-900 text-white"
/>

  <button
  onClick={handleSendOTP}
  disabled={loading}
  className="w-full mt-4 rounded-lg bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
>
  {loading ? "Sending OTP..." : "Send OTP"}
</button>
{message && (
  <p className="mt-4 text-center text-sm text-green-500">
    {message}
  </p>
)}
{showOTP && (
  <div className="mt-6">
    <input
      type="text"
      value={otp}
      onChange={(e) => setOtp(e.target.value)}
      placeholder="Enter OTP"
      className="w-full rounded-lg border p-3 bg-stone-900 text-white"
    />

    <button
  onClick={handleVerifyOTP}
  disabled={loading}
  className="w-full mt-4 rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
>
  {loading ? "Verifying..." : "Verify OTP"}
</button>
{showReset && (
  <div className="mt-6">
    <input
      type="password"
      placeholder="New Password"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      className="w-full rounded-lg border p-3 bg-stone-900 text-white mb-3"
    />

    <input
      type="password"
      placeholder="Confirm Password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      className="w-full rounded-lg border p-3 bg-stone-900 text-white mb-3"
    />

    <button
      onClick={handleResetPassword}
      disabled={loading}
      className="w-full rounded-lg bg-green-600 py-3 font-bold text-white hover:bg-green-700"
    >
      {loading ? "Resetting..." : "Reset Password"}
    </button>
  </div>
)}
  </div>
)}
</div>
      </div>
    </div>
  );
}