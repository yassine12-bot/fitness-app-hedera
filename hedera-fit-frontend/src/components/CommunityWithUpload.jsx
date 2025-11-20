import React, { useState, useEffect, useRef } from 'react';
import './Community.css';
import './CommunityUpload.css';

/**
 * COMMUNITY WITH UPLOAD - Onglet communauté avec fonctionnalité d'upload
 * 
 * FONCTIONNALITÉS:
 * - Affichage du feed (posts avec images/vidéos)
 * - ✨ NOUVEAU: Upload de photos/vidéos avec caption
 * - Like/Unlike des posts
 * - Commentaires sur les posts
 */

const CommunityWithUpload = ({ token, user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // États pour le formulaire d'upload
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3000/api/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erreur fetch posts:', error);
      setError('Erreur lors du chargement des posts');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId, isLiked) => {
    try {
      if (isLiked) {
        // Unlike
        await fetch('http://localhost:3000/api/likes', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ postId })
        });
      } else {
        // Like
        await fetch('http://localhost:3000/api/likes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ postId })
        });
      }
      
      // Mettre à jour l'état local
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            userLiked: isLiked ? 0 : 1,
            likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  const handleCommentSubmit = async (postId) => {
    if (!commentText.trim()) return;
    
    setSubmittingComment(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId,
          text: commentText
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCommentText('');
        await fetchPosts();
        setExpandedPost(postId);
      }
    } catch (error) {
      console.error('Erreur commentaire:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const fetchComments = async (postId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/comments/post/${postId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Erreur fetch comments:', error);
      return [];
    }
  };

  const toggleComments = async (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      const comments = await fetchComments(postId);
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return { ...post, comments };
        }
        return post;
      }));
      setExpandedPost(postId);
    }
  };

  // ===== NOUVELLES FONCTIONS POUR L'UPLOAD =====
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WEBP, MP4 ou MOV.');
      return;
    }

    // Vérifier la taille (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Le fichier est trop volumineux. Maximum 50 MB.');
      return;
    }

    setUploadFile(file);
    setUploadError('');

    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setUploadError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('media', uploadFile);
      formData.append('caption', uploadCaption);

      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Réinitialiser le formulaire
        setShowUploadForm(false);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadCaption('');
        
        // Recharger les posts
        await fetchPosts();
        
        // Afficher un message de succès
        alert('✅ Post publié avec succès !');
      } else {
        setUploadError(data.message || 'Erreur lors de la publication');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      setUploadError('Erreur lors de l\'upload. Vérifiez votre connexion.');
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setShowUploadForm(false);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadCaption('');
    setUploadError('');
  };

  if (loading) {
    return (
      <div className="community">
        <div className="loading">Chargement du feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="community">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="community">
      <div className="community-header">
        <h1>🌟 Communauté</h1>
        <p>Partage tes exploits avec la communauté Hedera Fit!</p>
        <button 
          className="btn-create-post"
          onClick={() => setShowUploadForm(true)}
        >
          📸 Créer un post
        </button>
      </div>

      {/* Formulaire d'upload */}
      {showUploadForm && (
        <div className="upload-modal">
          <div className="upload-modal-content">
            <h2>📸 Nouveau Post</h2>
            
            {uploadError && (
              <div className="error-message">{uploadError}</div>
            )}

            <form onSubmit={handleUploadSubmit}>
              {/* Zone de sélection de fichier */}
              <div 
                className="file-drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadPreview ? (
                  <div className="preview-container">
                    {uploadFile?.type.startsWith('video') ? (
                      <video src={uploadPreview} controls style={{ maxWidth: '100%', maxHeight: '400px' }} />
                    ) : (
                      <img src={uploadPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px' }} />
                    )}
                  </div>
                ) : (
                  <div className="drop-zone-placeholder">
                    <div className="drop-icon">📁</div>
                    <p>Cliquez pour sélectionner une photo ou vidéo</p>
                    <p className="drop-hint">JPEG, PNG, GIF, WEBP, MP4, MOV (Max 50 MB)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Caption */}
              <textarea
                className="upload-caption"
                placeholder="Écris une légende pour ton post..."
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                rows={3}
              />

              {/* Boutons */}
              <div className="upload-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={cancelUpload}
                  disabled={uploading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-publish"
                  disabled={!uploadFile || uploading}
                >
                  {uploading ? '⏳ Publication...' : '✅ Publier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feed des posts */}
      {posts.length === 0 ? (
        <div className="no-posts">
          <p>📭 Aucun post pour le moment</p>
          <p>Sois le premier à partager ton activité!</p>
        </div>
      ) : (
        <div className="posts-feed">
          {posts.map(post => (
            <div key={post.id} className="post-card">
              {/* Header du post */}
              <div className="post-header">
                <div className="post-author">
                  <div className="author-avatar">
                    {post.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="author-info">
                    <div className="author-name">{post.userName}</div>
                    <div className="post-date">
                      {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenu du post */}
              {post.caption && (
                <div className="post-caption">
                  {post.caption}
                </div>
              )}

              {/* Media */}
              {post.mediaUrl && (
                <div className="post-media">
                  {post.mediaType === 'image' ? (
                    <img src={`http://localhost:3000${post.mediaUrl}`} alt="Post" />
                  ) : (
                    <video controls>
                      <source src={`http://localhost:3000${post.mediaUrl}`} type="video/mp4" />
                    </video>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="post-actions">
                <button
                  className={`action-btn ${post.userLiked ? 'liked' : ''}`}
                  onClick={() => handleLike(post.id, post.userLiked)}
                >
                  {post.userLiked ? '❤️' : '🤍'} {post.likesCount}
                </button>
                <button
                  className="action-btn"
                  onClick={() => toggleComments(post.id)}
                >
                  💬 {post.commentsCount}
                </button>
              </div>

              {/* Section commentaires */}
              {expandedPost === post.id && (
                <div className="comments-section">
                  {post.comments && post.comments.length > 0 && (
                    <div className="comments-list">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-author">
                            <strong>{comment.userName}</strong>
                          </div>
                          <div className="comment-text">{comment.text}</div>
                          <div className="comment-date">
                            {new Date(comment.createdAt).toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire nouveau commentaire */}
                  <div className="comment-form">
                    <input
                      type="text"
                      placeholder="Ajouter un commentaire..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !submittingComment) {
                          handleCommentSubmit(post.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleCommentSubmit(post.id)}
                      disabled={!commentText.trim() || submittingComment}
                    >
                      {submittingComment ? '...' : '➤'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunityWithUpload;