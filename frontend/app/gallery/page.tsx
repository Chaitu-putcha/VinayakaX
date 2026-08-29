"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Heart,
  ImagePlus,
  ThumbsUp,
  MessageSquare,
  Download,
  Share2,
  Sparkles,
  Trash2
} from "lucide-react";

interface GalleryComment {
  name: string;
  text: string;
  date: string;
}

interface GalleryItem {
  favorite_users_json: string;
  id: number;
  uploader_name: string;
  user_id: number;
  type: string;
  url: string;
  caption: string;
  likes_count: number;
  comments_json: string;
  is_approved: boolean;
  album: string;
  ai_tags: string;
  created_at?: string;
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [aiQuery, setAiQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload Form State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState("General");
  const [tags, setTags] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Comment State
  const [activeCommentsId, setActiveCommentsId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [editCaption, setEditCaption] = useState("");
  const [editAlbum, setEditAlbum] = useState("General");
  const [editTags, setEditTags] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const albums = ["All", "Harathi", "Cultural", "Nimajjanam", "Decoration", "General"];

  const fetchGallery = (currentAlbum = album, currentSearch = search) => {
    setLoading(true);
    let apiPath = `https://vinayakax-backend.onrender.com/api/gallery?skip=0&limit=${page * pageSize}`;
    if (currentAlbum !== "All") apiPath += `&album=${currentAlbum}`;
    if (currentSearch) apiPath += `&search=${currentSearch}`;

    fetch(apiPath)
      .then(res => res.json())
      .then(data => {
  setItems(data);
  setLoading(false);
})
      .catch(() => {
        // Fallback Mock items
        setItems([
          {
            id: 1,
            favorite_users_json: "[]",
            uploader_name: "Venky Chotu",
            user_id: 1,
            type: "PHOTO",
            url: "https://images.unsplash.com/photo-1609137144813-94b15093f185?auto=format&fit=crop&q=80&w=600",
            caption: "Pratishtha Pooja Day 1 Ganesha",
            likes_count: 42,
            comments_json: JSON.stringify([{ name: "Yogesh", text: "Stunning decoration!", date: "2026-09-10" }]),
            is_approved: true,
            album: "General",
            ai_tags: "ganesha, decoration, stage, saffron, gold"
          },
          {
            id: 2,
            favorite_users_json: "[]",
            uploader_name: "Sekhar",
            user_id: 2,
            type: "PHOTO",
            url: "https://images.unsplash.com/photo-1567591905632-9a59eed2c4c4?auto=format&fit=crop&q=80&w=600",
            caption: "Grand evening Harathi at Putchavani Totalu Street",
            likes_count: 36,
            comments_json: "[]",
            is_approved: true,
            album: "Harathi",
            ai_tags: "harathi, fire, pooja, evening, lights"
          },
          {
            id: 3,
            favorite_users_json: "[]",
            uploader_name: "Karthik",
            user_id: 3,
            type: "PHOTO",
            url: "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=600",
            caption: "Nimajjanam Shobha Yatra preparation",
            likes_count: 28,
            comments_json: "[]",
            is_approved: true,
            album: "Nimajjanam",
            ai_tags: "procession, nimajjanam, yellow, drums, crowd"
          }
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
  fetchGallery(album, search);
}, [album, search, page]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to upload photos.");
      return;
    }

    try {
      setUploadProgress(10);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
  formData.append("files", file);
});
formData.append("caption", caption);
formData.append("album", selectedAlbum);
formData.append("tags", tags);

      const response = await fetch("https://vinayakax-backend.onrender.com/api/gallery/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        setUploadMsg("Photos uploaded successfully.");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setCaption("");
        setTags("");
        fetchGallery();
        setTimeout(() => {
          setIsUploading(false);
          setUploadMsg("");
          setUploadProgress(0);
        }, 3000);
      } else {
        toast.error("Upload failed.");
      }
    } catch {
      // Mock local success
      setUploadMsg("Photos uploaded successfully.");
      setTimeout(() => {
        setIsUploading(false);
        setUploadMsg("");
        setUploadProgress(0);
      }, 3500);
    }
  };
const handleDrag = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (e.type === "dragenter" || e.type === "dragover") {
    setDragActive(true);
  } else {
    setDragActive(false);
  }
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  setDragActive(false);

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const files = Array.from(e.dataTransfer.files);

setSelectedFiles(files);

setPreviewUrls(
  files.map((file) => URL.createObjectURL(file))
);
  }
};

const openFilePicker = () => {
  document.getElementById("gallery-upload-input")?.click();
};
  const handleLike = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to like this item.");
      return;
    }

    try {
      const response = await fetch(`https://vinayakax-backend.onrender.com/api/gallery/${id}/like`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) fetchGallery();
    } catch {
      // Mock like increment locally
      setItems(prev =>
        prev.map(i => (i.id === id ? { ...i, likes_count: i.likes_count + 1 } : i))
      );
    }
  };
const handleFavorite = async (id: number) => {
  const token = localStorage.getItem("token");

  if (!token) {
    toast.error("Please login first.");
    return;
  }

  const response = await fetch(
    `https://vinayakax-backend.onrender.com/api/gallery/${id}/favorite`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.ok) {
  fetchGallery();

  if (selectedImage?.id === id) {
    const updated = items.find(i => i.id === id);
    if (updated) {
      setSelectedImage(updated);
    }
  }
} else {
    toast.error("Favorite failed.");
  }
};
  const handleAddComment = async (
  e: React.FormEvent,
  itemId: number
) => {
  e.preventDefault();

  if (!commentText.trim()) return;

  const token = localStorage.getItem("token");

  if (!token) {
    toast.error("Please login to leave a comment.");
    return;
  }

  try {
    const response = await fetch(
      `https://vinayakax-backend.onrender.com/api/gallery/${itemId}/comment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: commentText,
        }),
      }
    );

    if (response.ok) {
      toast.success("Comment added");
      setCommentText("");
      fetchGallery();
    } else {
      toast.error("Unable to add comment");
    }
  } catch {
    toast.error("Unable to add comment");
  }
};
const handleDeleteComment = async (
  galleryId: number,
  commentIndex: number
) => {
  const token = localStorage.getItem("token");

  if (!token) {
    toast.error("Please login first.");
    return;
  }

  try {
    const response = await fetch(
      `https://vinayakax-backend.onrender.com/api/gallery/${galleryId}/comment/${commentIndex}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error();

    toast.success("Comment deleted");
    fetchGallery();
  } catch {
    toast.error("Unable to delete comment");
  }
};
  const handleAISearch = () => {
    if (!aiQuery.trim()) return;
    setSearch(aiQuery);
  };

  const handleShare = (item: GalleryItem) => {
    if (navigator.share) {
      navigator.share({
        title: item.caption,
        text: `Check out this media from UDDANAM RAMAKRISHNA PURAM Sri Vinayaka Festival 2026!`,
        url: item.url
      }).catch(console.warn);
    } else {
      navigator.clipboard.writeText(item.url);
      toast.success("Link copied successfully");
    }
  };
  const deletePhoto = async (id: number) => {
  const token = localStorage.getItem("token");

  if (!token) {
    toast.error("Please login first.");
    return;
  }

  if (!confirm("Delete this photo?")) return;

  const response = await fetch(
    `https://vinayakax-backend.onrender.com/api/gallery/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  if (response.ok) {
    fetchGallery();
  } else {
    toast.error("Unable to delete photo.");
  }
};
const handleEdit = async () => {

  if (!selectedImage) return;



  const token = localStorage.getItem("token");



  try {

    const response = await fetch(

      `https://vinayakax-backend.onrender.com/api/gallery/${selectedImage.id}`,

      {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify({

          type: selectedImage.type,

          url: selectedImage.url,

          caption: editCaption,

          album: editAlbum,

          ai_tags: editTags,

        }),

      }

    );


    if (!response.ok) throw new Error();

    toast.success("Photo updated successfully");

    fetchGallery();

    setShowViewer(false);

    setIsEditing(false);

  } catch {
    toast.error("Update failed");
  }
};
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (!showViewer) return;

    if (e.key === "ArrowRight") {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedImage(items[currentIndex + 1]);
      }
    }

    if (e.key === "ArrowLeft") {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setSelectedImage(items[currentIndex - 1]);
      }
    }

    if (e.key === "Escape") {
      setShowViewer(false);
    }
  };

  window.addEventListener("keydown", handleKey);

  return () => window.removeEventListener("keydown", handleKey);
}, [showViewer, currentIndex, items]);
const sortedItems = [...items];

if (sortBy === "likes") {
  sortedItems.sort((a, b) => b.likes_count - a.likes_count);
}
  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Navarathri Memories</span>
          <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">Media Gallery</h1>
        </div>
        <button
          onClick={() => setIsUploading(!isUploading)}
          className="flex items-center gap-2 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white px-5 py-2.5 text-xs font-bold shadow-md cursor-pointer"
        >
          <ImagePlus className="h-4 w-4" />
          Upload Photo/Video
        </button>
      </section>
      

      {/* Upload Modal Drawer */}
      {isUploading && (
        <section className="p-6 rounded-2xl glass-panel border border-gold-500/30 max-w-xl mx-auto space-y-4">
          <h3 className="text-lg font-bold text-stone-850 dark:text-white">Upload Photos</h3>
          {uploadMsg && (
            <p className="p-3 bg-green-100 border border-green-300 text-green-700 text-xs font-semibold rounded-lg">{uploadMsg}</p>
          )}
          <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
            {uploadProgress > 0 && uploadProgress < 100 && (
  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
    <div
      className="bg-orange-500 h-3 transition-all duration-300"
      style={{ width: `${uploadProgress}%` }}
    />
  </div>
)}
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block">Media Image URL</label>
              <div
  onDragEnter={handleDrag}
  onDragLeave={handleDrag}
  onDragOver={handleDrag}
  onDrop={handleDrop}
  onClick={openFilePicker}
  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
  ${
    dragActive
      ? "border-orange-500 bg-orange-100"
      : "border-gray-400 hover:border-orange-500"
  }`}
>

  <input
    id="gallery-upload-input"
    type="file"
    multiple
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);

setSelectedFiles(files);

setPreviewUrls(
  files.map((file) => URL.createObjectURL(file))
);
      }
    }}
  />

  <p className="text-lg font-semibold">
    📸 Drag & Drop Photos Here
  </p>

  <p className="text-gray-500 mt-2">
    or Click to Select Photos
  </p>

  {selectedFiles.length > 0 && (
  <>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
      {previewUrls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt="Preview"
          className="h-32 w-full object-cover rounded-lg border"
        />
      ))}
    </div>

    <div className="mt-4 space-y-1">
      {selectedFiles.map((file, index) => (
        <p
          key={index}
          className="text-sm text-green-600"
        >
          ✅ {file.name}
        </p>
      ))}
    </div>
  </>
)}
</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Caption</label>
                <input
                  type="text"
                  placeholder="Ganesha Aarti"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Album</label>
                <select
                  value={selectedAlbum}
                  onChange={e => setSelectedAlbum(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                >
                  {albums.filter(a => a !== "All").map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block">Search Tags (Comma separated)</label>
              <input
                type="text"
                placeholder="ganesha, flower, yellow, night"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center"
              >
                
                {uploadProgress > 0 && uploadProgress < 100
                  ? "Uploading..."
                  : "Upload Photos"}
              </button>
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="rounded-lg bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 text-stone-700 dark:text-stone-200 px-4 py-2.5 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Search Actions split */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Normal Text Search */}
        <div className="flex items-center gap-2 p-3 bg-white dark:bg-stone-900 border border-stone-250 dark:border-stone-750 rounded-full shadow-sm">
          <Search className="h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by caption..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-stone-800 dark:text-stone-100 focus:outline-none"
          />
        </div>

        {/* AI Smart Tag Search */}
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-saffron-50/50 to-gold-50/50 dark:from-amber-950/20 dark:to-stone-900/40 border border-gold-500/25 rounded-full shadow-sm">
          <Sparkles className="h-4 w-4 text-gold-500" />
          <input
            type="text"
            placeholder="AI Photo Search (e.g. 'golden crown ganesha')..."
            value={aiQuery}
            onChange={e => setAiQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-stone-800 dark:text-stone-100 focus:outline-none"
          />
          <button
            onClick={handleAISearch}
            className="bg-saffron-500 text-white rounded-full px-4 py-1 text-xs font-bold hover:bg-saffron-600 transition-colors"
          >
            Search Tags
          </button>
        </div>
      </section>
      <div className="flex justify-end mb-4">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="border border-gray-300 rounded-lg px-3 py-2 bg-white dark:bg-stone-900"
  >
    <option value="latest">Latest</option>
    <option value="likes">Most Liked</option>
  </select>
</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4">
    <p className="text-gray-500 text-sm">Photos</p>
    <h2 className="text-2xl font-bold">
      {items.length}
    </h2>
  </div>

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4">
    <p className="text-gray-500 text-sm">Albums</p>
    <h2 className="text-2xl font-bold">
      {new Set(items.map(i => i.album)).size}
    </h2>
  </div>

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4">
    <p className="text-gray-500 text-sm">Likes</p>
    <h2 className="text-2xl font-bold">
      {items.reduce((sum, i) => sum + i.likes_count, 0)}
    </h2>
  </div>

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4">
    <p className="text-gray-500 text-sm">Comments</p>
    <h2 className="text-2xl font-bold">
      {items.reduce(
        (sum, i) => sum + JSON.parse(i.comments_json || "[]").length,
        0
      )}
    </h2>
  </div>

</div>
<section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4 text-center">
    <h2 className="text-2xl font-bold">{items.length}</h2>
    <p className="text-gray-500 text-sm">Photos</p>
  </div>

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4 text-center">
    <h2 className="text-2xl font-bold">
      {items.reduce((sum, item) => sum + item.likes_count, 0)}
    </h2>
    <p className="text-gray-500 text-sm">Likes</p>
  </div>

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4 text-center">
    <h2 className="text-2xl font-bold">
      {new Set(items.map(item => item.uploader_name)).size}
    </h2>
    <p className="text-gray-500 text-sm">Contributors</p>
  </div>

  <div className="bg-white dark:bg-stone-900 rounded-xl shadow p-4 text-center">
    <h2 className="text-2xl font-bold">
      {new Set(items.map(item => item.album)).size}
    </h2>
    <p className="text-gray-500 text-sm">Albums</p>
  </div>

</section>
      {/* Album Selection Tabs */}
      <section className="flex gap-2 overflow-x-auto no-scrollbar border-b border-stone-250 dark:border-stone-750 pb-2">
        {albums.map((a) => (
          <button
            key={a}
            onClick={() => setAlbum(a)}
            className={`px-4 py-1.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer rounded-full ${
              album === a
                ? "bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 border border-saffron-500/30"
                : "text-stone-500 hover:text-stone-850"
            }`}
          >
            {a}
          </button>
        ))}
      </section>

      {/* Gallery Cards Grid */}
      {loading && (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="h-72 rounded-2xl bg-gray-200 dark:bg-stone-800 animate-pulse"
      />
    ))}
  </section>
  
)}
<button

      onClick={() => setPage((p) => p + 1)}

      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"

    >

      Load More

    </button>
{!loading && (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 && (
  <div className="col-span-full text-center py-20">
    <h2 className="text-2xl font-bold text-gray-500">
      📷 No Photos Available
    </h2>

    <p className="text-gray-400 mt-2">
      Be the first person to upload festival photos.
    </p>
  </div>
)}
        {items.map((item) => {
          const imageUrl =
  item.url.startsWith("http")
    ? item.url
    : `https://vinayakax-backend.onrender.com${item.url}`;

console.log("Rendered URL:", imageUrl);
          const comments: GalleryComment[] = JSON.parse(item.comments_json || "[]");
          return (
            <div
              key={item.id}
              className="group rounded-2xl overflow-hidden glass-panel border border-saffron-500/10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative"
            >
              {/* Photo Display with watermarking CSS overlay */}
              <div className="relative aspect-video bg-stone-900 overflow-hidden">
                <img
  loading="lazy"
  src={imageUrl}
  alt={item.caption}
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
  onClick={() => {
    setSelectedImage(item);
    setCurrentIndex(items.findIndex(i => i.id === item.id));
    setShowViewer(true);
  }}
/>
                
                {/* Dynamically Styled Watermark overlay */}
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-[8px] text-white/90 select-none tracking-widest font-mono uppercase border border-white/5 pointer-events-none">
                  URP Sri Vinayaka 2026
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-extrabold px-1.5 py-0.5 rounded uppercase block w-fit">
                    {item.album}
                  </span>
                  <p className="font-semibold text-stone-800 dark:text-stone-100 text-xs sm:text-sm mt-1">{item.caption}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Uploaded by {item.uploader_name}</p>
                </div>

                {/* Interactions Row */}
                <div className="flex items-center justify-between border-t border-stone-150 dark:border-stone-850 pt-3 text-[11px] text-stone-500">
                  <button
                    onClick={() => handleLike(item.id)}
                    className="flex items-center gap-1 hover:text-saffron-600 transition-colors focus:outline-none"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>{item.likes_count}</span>
                  </button>
<button
  onClick={() => handleFavorite(item.id)}
  className="hover:text-red-600 transition-colors"
>
  <Heart
  className={`h-4 w-4 ${
    JSON.parse(item.favorite_users_json || "[]").includes(
      localStorage.getItem("email")
    )
      ? "fill-red-500 text-red-500"
      : ""
  }`}
/>
</button>
                  <button
                    onClick={() => setActiveCommentsId(activeCommentsId === item.id ? null : item.id)}
                    className="flex items-center gap-1 hover:text-saffron-600 transition-colors focus:outline-none"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{comments.length} Comments</span>
                  </button>

                  <a
                    href={
  item.url.startsWith("http")
    ? item.url
    : `https://vinayakax-backend.onrender.com${item.url}`
}
                    download={`vinayakax_${item.id}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-saffron-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  <button
                    onClick={() => handleShare(item)}
                    className="hover:text-saffron-600 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  {(
  item.user_id === Number(localStorage.getItem("user_id")) ||
  localStorage.getItem("role") === "ADMIN" ||
localStorage.getItem("role") === "VOLUNTEER"
) && (
  <button
    onClick={() => deletePhoto(item.id)}
    className="hover:text-red-600 transition-colors"
  >
    <Trash2 className="h-4 w-4" />
  </button>
)}
                </div>

                {/* Inline Comment Drawer section */}
                {activeCommentsId === item.id && (
                  <div className="mt-3 border-t border-stone-150 dark:border-stone-800 pt-3 space-y-2 text-[10px]">
                    <div className="max-h-24 overflow-y-auto space-y-1.5 no-scrollbar">
                      {comments.map((c: GalleryComment, cIdx: number) => (
                        <div
  key={cIdx}
  className="bg-stone-50 dark:bg-stone-900 rounded p-2 flex justify-between items-center"
>
  <div>
    <span className="font-bold">
      {c.name}:
    </span>

    <span className="ml-1">
      {c.text}
    </span>
  </div>

  {(c.name === localStorage.getItem("fullName") ||
    localStorage.getItem("role") === "ADMIN" ||
    localStorage.getItem("role") === "VOLUNTEER") && (
    <button
      onClick={() => handleDeleteComment(item.id, cIdx)}
      className="text-red-600 hover:text-red-800 text-xs"
    >
      🗑
    </button>
  )}
</div>
                      ))}
                      </div>
                    <form onSubmit={(e) => handleAddComment(e, item.id)} className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-250 dark:border-stone-850 rounded px-2 py-1 focus:outline-none focus:border-saffron-500 text-stone-800 dark:text-stone-100"
                      />
                      <button
                        type="submit"
                        className="bg-saffron-500 text-white px-2.5 py-1 rounded font-bold hover:bg-saffron-600"
                      >
                        Post
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
      )}
      {/* Full Screen Image Viewer */}
{showViewer && selectedImage && (
  <div
    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
    onClick={() => {
  setShowViewer(false);
  setZoom(1);
}}
  >
    <div
  className="relative max-w-6xl w-full"
  onClick={(e) => e.stopPropagation()}
  onWheel={(e) => {
    e.preventDefault();

    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.1, 5));
    } else {
      setZoom((z) => Math.max(z - 0.1, 1));
    }
  }}
>
      {/* Close Button */}
      
      <div className="absolute top-4 left-4 flex gap-2 z-20">

  <button
    onClick={() => setZoom(Math.max(1, zoom - 0.2))}
    className="bg-black/70 hover:bg-black text-white w-10 h-10 rounded-full"
  >
    ➖
  </button>

  <button
    onClick={() => setZoom(1)}
    className="bg-black/70 hover:bg-black text-white px-4 rounded-full"
  >
    100%
  </button>

  <button
    onClick={() => setZoom(zoom + 0.2)}
    className="bg-black/70 hover:bg-black text-white w-10 h-10 rounded-full"
  >
    ➕
  </button>

</div>
      

<div className="absolute top-4 right-20 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
  {currentIndex + 1} / {items.length}
</div>
      <button
        onClick={() => {
  setShowViewer(false);
  setZoom(1);
}}
        className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 text-xl font-bold z-10"
      >
        ✕
      </button>
<button
  disabled={currentIndex === 0}
  onClick={() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedImage(items[currentIndex - 1]);
    }
  }}
  className={`absolute left-4 top-1/2 -translate-y-1/2
bg-black/60 text-white text-3xl
w-12 h-12 rounded-full
${
currentIndex===0
?"opacity-30 cursor-not-allowed"
:"hover:bg-black"
}`}
>
  ❮
</button>
      {/* Image */}
      <img
      loading="lazy"
  src={
  selectedImage.url.startsWith("http")
    ? selectedImage.url
    : `https://vinayakax-backend.onrender.com${selectedImage.url}`
}
  alt={selectedImage.caption}
  className="w-full max-h-[80vh] object-contain rounded-xl transition-all duration-300"
  style={{
    transform: `scale(${zoom})`,
  }}
  onDoubleClick={() => {
  setZoom((z) => (z === 1 ? 2 : 1));
}}
/>
<button
  disabled={currentIndex === items.length - 1}
  onClick={() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedImage(items[currentIndex + 1]);
    }
  }}
  className={`absolute right-4 top-1/2 -translate-y-1/2
bg-black/60 text-white text-3xl
w-12 h-12 rounded-full
${
currentIndex === items.length - 1
? "opacity-30 cursor-not-allowed"
: "hover:bg-black"
}`}
>
  ❯
</button>
      {/* Details */}
      <div className="bg-white dark:bg-stone-900 rounded-b-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">

        <div>
          {isEditing ? (
  <input
    type="text"
    value={editCaption}
    onChange={(e) => setEditCaption(e.target.value)}
    className="border rounded px-3 py-2 w-full text-black"
  />
) : (
  <h2 className="text-lg font-bold">
    {selectedImage.caption}
  </h2>
)}

          <p className="text-sm text-gray-500">
            Uploaded by {selectedImage.uploader_name}
          </p>

          {isEditing ? (
  <select
    value={editAlbum}
    onChange={(e) => setEditAlbum(e.target.value)}
    className="border rounded px-3 py-2 text-black"
  >
    {albums
      .filter((a) => a !== "All")
      .map((a) => (
        <option key={a}>{a}</option>
      ))}
  </select>
) : (
  <>
    <p className="text-xs text-gray-400">
      Album : {selectedImage.album}
    </p>

    <p className="text-xs text-gray-500 mt-2">
      <span className="font-semibold">AI Tags:</span>{" "}
      {selectedImage.ai_tags || "No tags"}
    </p>

    <p className="text-xs text-gray-500">
      Uploaded:{" "}
      {selectedImage.created_at
        ? new Date(selectedImage.created_at).toLocaleString()
        : "Unknown"}
    </p>
  </>
)
}
                </div>
                

        <div className="flex gap-4">

          <button
  onClick={() => handleLike(selectedImage.id)}
  className="text-blue-600 hover:text-blue-800"
>
  👍 Like
</button>

<button
  onClick={() => handleFavorite(selectedImage.id)}
  className={`${
    JSON.parse(selectedImage.favorite_users_json || "[]").includes(
      localStorage.getItem("email")
    )
      ? "text-red-600"
      : "text-gray-500"
  }`}
>
  ❤️ Favorite
</button>

          <a
            href={
  selectedImage.url.startsWith("http")
    ? selectedImage.url
    : `https://vinayakax-backend.onrender.com${selectedImage.url}`
}
            download
            className="text-green-600 hover:text-green-800"
          >
            ⬇ Download
          </a>

          <button
            onClick={() => handleShare(selectedImage)}
            className="text-purple-600 hover:text-purple-800"
          >
            🔗 Share
          </button>

          {(selectedImage.user_id === Number(localStorage.getItem("user_id")) ||
            localStorage.getItem("role") === "ADMIN" ||
            localStorage.getItem("role") === "VOLUNTEER") && (
            <>
              <button
                onClick={() => {
                  setEditCaption(selectedImage.caption);
                  setEditAlbum(selectedImage.album);
                  setEditTags(selectedImage.ai_tags);
                  setIsEditing(true);
                }}
                className="text-orange-600 hover:text-orange-800"
              >
                ✏ Edit
              </button>

              <button
                onClick={() => {
                  deletePhoto(selectedImage.id);
                  setShowViewer(false);
                  setZoom(1);
                }}
                className="text-red-600 hover:text-red-800"
              >
                🗑 Delete
              </button>

              {isEditing && (
                <>
                  <button
                    onClick={handleEdit}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    💾 Save
                  </button>

                  <button
                    onClick={() => {
                      setEditCaption(selectedImage.caption);
                      setEditAlbum(selectedImage.album);
                      setEditTags(selectedImage.ai_tags);
                      setIsEditing(false);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
}