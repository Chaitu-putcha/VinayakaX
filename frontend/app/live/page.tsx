"use client";

import { useRef, useState } from "react";
import {
  Play,
  Video,
  Plus,
  Upload,
  Trash2,
  X,
  User,
} from "lucide-react";

interface VideoItem {
  id: number;
  title: string;
  video_url: string;
  added_by: string;
  added_by_id: number;
  created_at: string;
}

export default function LiveDarshan() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temporary current user
  // Later we will get this from login/backend
  const currentUser = {
    id: Number(localStorage.getItem("user_id")) || 1,
    name: localStorage.getItem("fullName") || "Devotee",
    role: localStorage.getItem("role") || "user",
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file.");
      return;
    }

    setSelectedFile(file);

    if (!videoTitle.trim()) {
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a video.");
      return;
    }

    if (!videoTitle.trim()) {
      alert("Please enter a video title.");
      return;
    }

    setUploading(true);

    try {
      // TEMPORARY FRONTEND PREVIEW
      // Next step: replace this with backend API upload

      const videoUrl = URL.createObjectURL(selectedFile);

      const newVideo: VideoItem = {
        id: Date.now(),
        title: videoTitle,
        video_url: videoUrl,
        added_by: currentUser.name,
        added_by_id: currentUser.id,
        created_at: new Date().toISOString(),
      };

      setVideos((previousVideos) => [
        newVideo,
        ...previousVideos,
      ]);

      setSelectedFile(null);
      setVideoTitle("");
      setShowUploadModal(false);

      alert("Video added successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to upload video.");
    } finally {
      setUploading(false);
    }
  };

  const canDeleteVideo = (video: VideoItem) => {
    return (
      video.added_by_id === currentUser.id ||
      currentUser.role === "admin" ||
      currentUser.role === "volunteer"
    );
  };

  const handleDelete = (videoId: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this video?"
    );

    if (!confirmDelete) return;

    setVideos((previousVideos) =>
      previousVideos.filter((video) => video.id !== videoId)
    );
  };

  const closeModal = () => {
    if (uploading) return;

    setShowUploadModal(false);
    setSelectedFile(null);
    setVideoTitle("");
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div className="space-y-2">
          <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
            Sri Vinayaka Video Portal
          </span>

          <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white flex items-center gap-3">
            <Video className="h-8 w-8 text-saffron-500" />
            Darshan Videos
          </h1>

          <p className="text-sm text-stone-500 dark:text-stone-400">
            Upload, watch and share Sri Vinayaka Mahotsavam celebrations.
          </p>
        </div>

        {/* Add Video */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 hover:from-saffron-600 hover:to-gold-600 text-white px-6 py-3 text-sm font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Add Video
        </button>
      </section>

      {/* Video Count */}
      <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Video className="h-4 w-4 text-saffron-500" />
        <span>
          {videos.length} {videos.length === 1 ? "Video" : "Videos"} Available
        </span>
      </div>

      {/* Videos */}
      <section>
        {videos.length === 0 ? (
          <div className="py-24 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/40 dark:bg-stone-900/40">
            <Video className="h-14 w-14 mx-auto mb-4 text-saffron-500" />

            <h2 className="text-xl font-bold text-stone-800 dark:text-white">
              No Videos Available
            </h2>

            <p className="text-stone-500 mt-2">
              Be the first devotee to upload a celebration video.
            </p>

            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-6 inline-flex items-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all"
            >
              <Upload className="h-4 w-4" />
              Upload First Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-gold-500/20 shadow-md hover:shadow-xl transition-all"
              >
                {/* Video */}
                <div className="aspect-video bg-black relative">
                  <video
                    src={video.video_url}
                    controls
                    className="w-full h-full object-cover"
                  />

                  {/* Delete Button */}
                  {canDeleteVideo(video) && (
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all"
                      title="Delete Video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <Play className="h-4 w-4 mt-1 text-saffron-500 fill-saffron-500 shrink-0" />

                    <h2 className="font-bold text-stone-900 dark:text-white line-clamp-1">
                      {video.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-stone-500">
                    <User className="h-3.5 w-3.5" />
                    <span>Added by {video.added_by}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-950 shadow-2xl border border-stone-200 dark:border-stone-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                  Upload Darshan Video
                </h2>

                <p className="text-xs text-stone-500 mt-1">
                  Share your Sri Vinayaka Mahotsavam moments.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Video Title
                </label>

                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-saffron-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Select Video
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-saffron-500/40 hover:border-saffron-500 rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all"
                >
                  <Upload className="h-8 w-8 text-saffron-500" />

                  <span className="font-bold text-sm text-stone-700 dark:text-stone-300">
                    {selectedFile
                      ? selectedFile.name
                      : "Click here to select a video"}
                  </span>

                  <span className="text-xs text-stone-500">
                    Select a video from your device
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={closeModal}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900"
              >
                Cancel
              </button>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 disabled:opacity-60 text-white text-sm font-bold"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Video"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}