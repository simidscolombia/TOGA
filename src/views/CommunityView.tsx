
import React, { useState } from 'react';
import { Post } from '../types';
import { Card, Button } from '../components/UIComponents';
import { ThumbsUp, MessageSquare } from 'lucide-react';

export const CommunityView = ({ user, posts, onAddPost }: any) => {
    const [newPostContent, setNewPostContent] = useState('');
    const [isAnon, setIsAnon] = useState(false);

    const handlePost = () => {
        if (!newPostContent.trim()) return;
        onAddPost({
            id: Date.now().toString(),
            author: isAnon ? 'Anónimo' : user.name,
            authorRole: 'Abogado',
            content: newPostContent,
            likes: 0,
            comments: 0,
            isAnonymous: isAnon,
            tags: ['General'],
            timestamp: 'Ahora'
        });
        setNewPostContent('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-4 bg-white">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold">{user.name[0]}</div>
                    <div className="flex-1" data-toga-help="community-post-input">
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Comparte una duda jurídica o un caso de éxito..."
                            className="w-full p-2 bg-slate-50 rounded-lg border-transparent focus:bg-white focus:border-slate-300 focus:ring-0 transition-all resize-none h-20"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                                <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                Publicar como anónimo
                            </label>
                            <Button onClick={handlePost} disabled={!newPostContent}>Publicar</Button>
                        </div>
                    </div>
                </div>
            </Card>

            {posts.map((post: Post) => (
                <Card key={post.id} className="p-0">
                    <div className="p-4 border-b border-slate-50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                ${post.isAnonymous ? 'bg-slate-400' : 'bg-blue-600'}`}>
                                {post.author[0]}
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">{post.author}</h4>
                                <p className="text-xs text-slate-500">{post.authorRole} • {post.timestamp}</p>
                            </div>
                        </div>
                        <p className="text-slate-700 leading-relaxed mb-3">{post.content}</p>
                        <div className="flex gap-2">
                            {post.tags.map(tag => (
                                <span key={tag} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">#{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div className="px-4 py-3 bg-slate-50 flex gap-6 text-sm text-slate-500 font-medium">
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <ThumbsUp className="w-4 h-4" /> {post.likes}
                        </button>
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <MessageSquare className="w-4 h-4" /> {post.comments}
                        </button>
                    </div>
                </Card>
            ))}
        </div>
    );
};
