import React, { useState, useEffect } from 'react';
import API from '../api';
import { Star, Send, User, MessageSquare, X } from 'lucide-react';

const Reviews = () => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [reviewsList, setReviewsList] = useState([]);
    const [showReviewsModal, setShowReviewsModal] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await API.get('/review');
            setReviewsList(res.data);
        } catch (err) { console.error("Error fetching reviews", err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return alert("Please select a star rating!");

        try {
            const payload = {
                rating,
                comment,
                customerName: customerName || "Happy Customer"
            };
            await API.post('/review', payload);
            setSubmitted(true);
            fetchReviews();
            setTimeout(() => {
                setSubmitted(false);
                setRating(0);
                setComment('');
                setCustomerName('');
            }, 3000);
        } catch (err) { alert("Failed to submit review"); }
    };

    return (
        <div
            className="relative py-16 px-6 bg-cover bg-center bg-fixed"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2400&auto=format&fit=crop')`
            }}
        >
            <div className="absolute inset-0 bg-black/70"></div>

            <div className="relative z-10 max-w-6xl mx-auto">

                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-3xl font-black uppercase italic tracking-tighter text-white mb-4 drop-shadow-lg">
                        Rate Your Experience
                    </h2>
                    <p className="text-gray-300 text-lg mb-10 font-light">
                        Loved our coffee & sweets? Let the world know!
                    </p>

                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-2xl max-w-md mx-auto border-4 border-white/20">
                            {/* Star Input */}
                            <div className="flex justify-center space-x-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        className="transition-transform hover:scale-125 focus:outline-none"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(rating)}
                                    >
                                        <Star size={36} className={`${star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors`} />
                                    </button>
                                ))}
                            </div>

                            <input
                                type="text"
                                placeholder="Your Name (Optional)"
                                className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-red-200 text-sm mb-3 border border-gray-100"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />

                            <textarea
                                placeholder="Write a small review..."
                                className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-red-200 text-sm mb-4 resize-none border border-gray-100"
                                rows="3"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />

                            <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center justify-center shadow-lg transform hover:-translate-y-1">
                                Submit Review <Send size={18} className="ml-2" />
                            </button>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowReviewsModal(true)}
                                    className="text-gray-500 text-sm font-bold flex items-center justify-center w-full hover:text-red-600 transition-colors"
                                >
                                    <MessageSquare size={16} className="mr-2" /> See What Others Say
                                </button>
                            </div>

                        </form>
                    ) : (
                        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg mx-auto text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Star size={32} fill="currentColor" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Thank You! ❤️</h3>
                            <p className="text-gray-500">Your review means a lot to us.</p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="mt-6 text-red-600 font-bold underline text-sm hover:text-red-800"
                            >
                                Write another review
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- REVIEWS MODAL (No Changes needed here, same as before) --- */}
            {showReviewsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col scale-in-center overflow-hidden">
                        <div className="bg-red-600 p-6 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase">Customer Reviews</h2>
                                <p className="text-red-100 text-xs mt-1">Total {reviewsList.length} reviews</p>
                            </div>
                            <button onClick={() => setShowReviewsModal(false)} className="hover:rotate-90 transition-transform p-2 bg-white/20 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-4 bg-gray-50 flex-1">
                            {reviewsList.length > 0 ? (
                                reviewsList.map((review) => (
                                    <div key={review.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-red-100 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-red-50 p-2 rounded-full text-red-600">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 leading-tight">{review.customerName}</h4>
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={12}
                                                        className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed pl-11">
                                            "{review.comment}"
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No reviews yet. Be the first to review!</p>
                                </div>
                            )}
                        </div>

                        <div className="p-2 bg-white border-t border-gray-100 text-center shrink-0">
                            <button onClick={() => setShowReviewsModal(false)} className="text-red-600 font-bold text-sm hover:underline">
                                Close Reviews
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reviews;