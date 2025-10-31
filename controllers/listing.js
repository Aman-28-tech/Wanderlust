const { geocoding, config } = require('@maptiler/client');
const Listing = require("../models/listing.js");

// Show all listings
module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    return res.render("listings/index.ejs", { allListings });
};

// Render new listing form
module.exports.renderNewForm = (req, res) => {
    return res.render("listings/new.ejs");
};

// Show single listing
module.exports.showListing = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" },
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }

    return res.render("listings/show.ejs", { listing, mapToken: process.env.MAP_TOKEN });
};

// Create new listing
module.exports.createListing = async (req, res) => {
    try {
        const location = req.body.listing?.location;
        if (!location || location.trim() === "") {
            req.flash("error", "Location is required!");
            return res.redirect("/listings/new");
        }

        if (!process.env.MAP_TOKEN) {
            throw new Error("MapTiler API key is missing. Set MAP_TOKEN in .env");
        }
        config.apiKey = process.env.MAP_TOKEN;

        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;

        if (req.file) {
            newListing.image = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        const response = await geocoding.forward(location, { limit: 1 });
        if (!response.features || response.features.length === 0) {
            req.flash("error", "Invalid location provided!");
            return res.redirect("/listings/new");
        }

        const feature = response.features[0];
        newListing.geometry = {
            type: "Point",
            coordinates: feature.geometry.coordinates
        };

        await newListing.save();
        req.flash("success", "New Listing Created!");
        return res.redirect("/listings");
    } catch (err) {
        console.error("Error creating listing:", err);
        if (!res.headersSent) {
            req.flash("error", "Something went wrong while creating the listing.");
            return res.redirect("/listings");
        }
    }
};

// Render edit form
module.exports.editListing = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url.replace("/upload", "/upload/w_250");
    return res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// Update listing
module.exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;

        if (!process.env.MAP_TOKEN) {
            req.flash("error", "MapTiler API key is missing. Please set MAP_TOKEN in .env");
            return res.redirect("/listings");
        }
        config.apiKey = process.env.MAP_TOKEN;

        let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });
        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }

        if (req.file) {
            listing.image = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        if (req.body.listing.location && req.body.listing.location.trim() !== "") {
            const response = await geocoding.forward(req.body.listing.location, { limit: 1 });
            if (response.features && response.features.length > 0) {
                const feature = response.features[0];
                listing.geometry = {
                    type: "Point",
                    coordinates: feature.geometry.coordinates
                };
            }
        }

        await listing.save();
        req.flash("success", "Listing Updated!");
        return res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Error updating listing:", err);
        if (!res.headersSent) {
            req.flash("error", "Something went wrong while updating the listing.");
            return res.redirect("/listings");
        }
    }
};

// Delete listing
module.exports.deleteListing = async (req, res) => {
    const { id } = req.params;
    const deleted = await Listing.findByIdAndDelete(id);
    if (!deleted) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing Deleted!");
    return res.redirect("/listings");
};
