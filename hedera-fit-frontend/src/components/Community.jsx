import React, { useState, useEffect } from 'react';
import './Community.css';

/**
 * COMMUNITY - Onglet pour posts, commentaires et likes
 * 
 * FONCTIONNALITÉS:
 * - Affichage du feed (posts avec images/vidéos)
 * - Like/Unlike des posts
 * - Commentaires sur les posts
 * - Créer un nouveau post (futur)
 */

const Community = ({ token, user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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
        // Rafraîchir les posts pour obtenir le nouveau commentaire
        await fetchPosts();
        // Garder le post étendu après ajout du commentaire
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
      </div>

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
                    <img src={post.mediaUrl} alt="Post" />
                  ) : (
                    <video controls>
                      <source src={post.mediaUrl} type="video/mp4" />
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

export default Community;