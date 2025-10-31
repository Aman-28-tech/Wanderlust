const Listing = require("../models/listing.js");
const Review = require("../models/review.js");

module.exports.createReview = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    const newReview = new Review({
        comment: req.body.review.comment,
        rating: req.body.review.rating,
        author: req.user._id
    });

    await newReview.save();
    listing.reviews.push(newReview._id);
    await listing.save();

    req.flash("success", "New Review Created!");
    return res.redirect(`/listings/${listing._id}`);
};

module.exports.deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted!");
    return res.redirect(`/listings/${id}`);
};
