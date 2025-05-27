import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import abi from "./contract/SocialMedia.json";
import "./index.css";

const contractAddress = "0x3384390705fd233a93d6c8a66018a50c37a6bbd6";

// Local media cache
const MEDIA_CACHE_PREFIX = "buzznet_media_";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [content, setContent] = useState("");
  const [mediaURL, setMediaURL] = useState("");
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [mediaCache, setMediaCache] = useState({});

  useEffect(() => {
    // Load media cache from localStorage
    try {
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith(MEDIA_CACHE_PREFIX));
      const cache = {};
      cacheKeys.forEach(key => {
        const mediaId = key.replace(MEDIA_CACHE_PREFIX, '');
        cache[mediaId] = localStorage.getItem(key);
      });
      setMediaCache(cache);
    } catch (error) {
      console.error("Error loading media cache:", error);
    }

    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const signer = provider.getSigner();
        const addr = await signer.getAddress();
        setAccount(addr);

        const socialMedia = new ethers.Contract(contractAddress, abi, signer);
        setContract(socialMedia);

        const count = await socialMedia.postCount();
        const postArray = [];
        for (let i = count; i >= 1; i--) {
          const post = await socialMedia.getPost(i);
          postArray.push(post);
          
          // Load comments for each post
          loadComments(socialMedia, i);
        }
        setPosts(postArray);
      }
    };

    init();
  }, []);

  const loadComments = async (socialMediaContract, postId) => {
    try {
      const commentCount = await socialMediaContract.getCommentCount(postId);
      const postComments = [];
      
      for (let i = 1; i <= commentCount; i++) {
        const comment = await socialMediaContract.getComment(postId, i);
        postComments.push(comment);
      }
      
      setComments(prev => ({
        ...prev,
        [postId]: postComments
      }));
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  // Save media to localStorage cache and return an ID
  const saveMediaToCache = (mediaData) => {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cacheKey = MEDIA_CACHE_PREFIX + mediaId;
    
    try {
      localStorage.setItem(cacheKey, mediaData);
      setMediaCache(prev => ({
        ...prev,
        [mediaId]: mediaData
      }));
      return mediaId;
    } catch (error) {
      console.error("Error saving to media cache:", error);
      // If localStorage fails (e.g., quota exceeded), return a smaller version
      if (error.name === 'QuotaExceededError') {
        return "storage_error:quota_exceeded";
      }
      return null;
    }
  };

  // Get media from cache
  const getMediaFromCache = (mediaId) => {
    if (!mediaId) return null;
    if (mediaId.startsWith("storage_error:")) return null;
    
    // First check our state cache
    if (mediaCache[mediaId]) return mediaCache[mediaId];
    
    // Then check localStorage
    try {
      const cacheKey = MEDIA_CACHE_PREFIX + mediaId;
      const cachedMedia = localStorage.getItem(cacheKey);
      if (cachedMedia) {
        // Update our state cache
        setMediaCache(prev => ({
          ...prev,
          [mediaId]: cachedMedia
        }));
        return cachedMedia;
      }
    } catch (error) {
      console.error("Error reading from media cache:", error);
    }
    
    return null;
  };

  const createPost = async () => {
    if (!content) return;
    
    try {
      let mediaId = "";
      
      // If we have media, store it in our cache
      if (mediaURL) {
        mediaId = saveMediaToCache(mediaURL);
      }
      
      const tx = await contract.createPost(content, mediaId || "");
      await tx.wait();
      window.location.reload();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Error creating post: " + (error.message || "Unknown error"));
    }
  };

  const likePost = async (id) => {
    try {
      const tx = await contract.likePost(id);
      await tx.wait();
      window.location.reload();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const addComment = async (postId) => {
    if (!newComments[postId]) return;
    
    try {
      const tx = await contract.addComment(postId, newComments[postId]);
      await tx.wait();
      
      // Update the UI
      const comment = {
        id: posts.find(p => p.id.toString() === postId.toString()).commentCount + 1,
        postId,
        author: account,
        content: newComments[postId],
        timestamp: { toNumber: () => Math.floor(Date.now() / 1000) }
      };
      
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment]
      }));
      
      // Clear the comment input
      setNewComments(prev => ({
        ...prev,
        [postId]: ""
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select a file smaller than 5MB.");
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaURL(reader.result);
        setIsUploading(false);
      };
      reader.onerror = () => {
        console.error("Error reading file");
        setIsUploading(false);
        alert("Failed to read file. Please try another file.");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
      alert("Error uploading file: " + (error.message || "Unknown error"));
    }
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts.toNumber() * 1000);
    return date.toLocaleString();
  };

  const shortenAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getMediaForPost = (post) => {
    if (!post.mediaURL) return null;
    
    // Check if it's already a data URL
    if (post.mediaURL.startsWith('data:')) {
      return post.mediaURL;
    }
    
    // Otherwise, it's a media ID, so get it from cache
    return getMediaFromCache(post.mediaURL);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-6 text-center text-yellow-400">Social_media</h1>
        <div className="mb-6 text-center">
          <span className="text-sm text-yellow-200">Wallet Connected:</span><br />
          <span className="text-xs font-mono text-yellow-400 bg-yellow-900/30 px-3 py-1 inline-block rounded">{shortenAddress(account)}</span>
        </div>

        <div className="bg-yellow-900/20 border-2 border-yellow-500/30 rounded-xl p-6 mb-8">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's buzzing on your mind?"
            className="w-full p-3 rounded-xl text-black border-2 border-yellow-500 bg-yellow-50 focus:outline-none focus:ring focus:ring-yellow-500 mb-3"
          />
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="flex-1">
              <input
                type="file"
                id="media-upload"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="media-upload" className="cursor-pointer flex items-center justify-center p-3 rounded-xl border-2 border-dashed border-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40 transition">
                📷 {isUploading ? "Uploading..." : "Add Photo/Video"}
              </label>
            </div>
            <button
              onClick={createPost}
              disabled={!content || isUploading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50"
            >
              🚀 Post
            </button>
          </div>
          {mediaURL && (
            <div className="mt-3 relative">
              <button 
                onClick={() => setMediaURL("")} 
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8"
              >
                ✕
              </button>
              {mediaURL.startsWith('data:image') ? (
                <img src={mediaURL} alt="Upload preview" className="max-h-60 rounded-lg object-contain mx-auto" />
              ) : mediaURL.startsWith('data:video') ? (
                <video src={mediaURL} controls className="max-h-60 rounded-lg object-contain mx-auto" />
              ) : (
                <div className="text-yellow-300">Media URL: {mediaURL}</div>
              )}
            </div>
          )}
        </div>

        <h2 className="text-3xl font-semibold mb-4 text-yellow-400">📝 Latest Posts</h2>
        {posts.length === 0 ? (
          <p className="text-yellow-200">No posts yet. Be the first to post!</p>
        ) : (
          posts.map((post) => {
            const postMedia = getMediaForPost(post);
            
            return (
              <div key={post.id.toString()} className="bg-gray-900/90 border border-yellow-500/30 p-6 rounded-2xl shadow-md mb-6 transition hover:border-yellow-500">
                <div className="text-sm text-yellow-300 mb-2">👤 {shortenAddress(post.author)}</div>
                <div className="text-lg font-medium text-white mb-3">{post.content}</div>
                
                {postMedia && (
                  <div className="mb-4">
                    {postMedia.startsWith('data:image') ? (
                      <img src={postMedia} alt="Post media" className="max-h-96 rounded-lg object-contain mx-auto" />
                    ) : postMedia.startsWith('data:video') ? (
                      <video src={postMedia} controls className="max-h-96 rounded-lg object-contain mx-auto" />
                    ) : null}
                  </div>
                )}
                
                <div className="text-xs text-yellow-300/70 mb-4">📅 {formatTimestamp(post.timestamp)}</div>
                <div className="flex items-center justify-between mb-5">
                  <div className="text-sm text-white">❤️ {post.likes.toString()}</div>
                  <button
                    onClick={() => likePost(post.id)}
                    className="text-xs bg-yellow-600 hover:bg-yellow-700 text-black px-3 py-1 rounded-full font-semibold shadow"
                  >
                    ❤️ Like
                  </button>
                </div>
                
                {/* Comments section */}
                <div className="mt-4 border-t border-yellow-500/20 pt-4">
                  <h3 className="text-md font-semibold text-yellow-400 mb-2">
                    💬 Comments ({post.commentCount.toString()})
                  </h3>
                  
                  {/* Comment list */}
                  <div className="mb-3 max-h-60 overflow-y-auto">
                    {comments[post.id.toString()] && comments[post.id.toString()].length > 0 ? (
                      comments[post.id.toString()].map((comment) => (
                        <div key={`${post.id}-${comment.id}`} className="bg-gray-800/80 p-3 rounded-lg mb-2">
                          <div className="text-xs text-yellow-300">
                            {shortenAddress(comment.author)} • {formatTimestamp(comment.timestamp)}
                          </div>
                          <div className="text-sm text-white">{comment.content}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">No comments yet</p>
                    )}
                  </div>
                  
                  {/* Add comment */}
                  <div className="flex gap-2">
                    <input
                      value={newComments[post.id] || ""}
                      onChange={(e) => setNewComments({...newComments, [post.id]: e.target.value})}
                      placeholder="Add a comment..."
                      className="flex-1 p-2 text-sm text-black bg-yellow-50 rounded-lg border border-yellow-500/50 focus:outline-none focus:ring focus:ring-yellow-500"
                    />
                    <button
                      onClick={() => addComment(post.id)}
                      disabled={!newComments[post.id]}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;
