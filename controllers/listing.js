const { geocoding,config} = require('@maptiler/client');
const Listing=require("../models/listing.js");

module.exports.index=async (req,res)=>{
    const allListings= await Listing.find({});
    res.render("listings/index.ejs",{allListings});
};

module.exports.renderNewForm=(req,res)=>{
    res.render("listings/new.ejs");
};

module.exports.showListing=async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id).populate({path:"reviews",
        populate:{
            path:"author"},
    }).populate("owner");
    if(!listing){
        req.flash("error","Listing you required for does not exist!");
        return res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs",{listing,mapToken: process.env.MAP_TOKEN});

};


module.exports.createListing = async (req, res) => {
    try {
        // Check if location is provided
        const location = req.body.listing?.location;
        if (!location || location.trim() === "") {
            req.flash("error", "Location is required!");
            return res.redirect("/listings/new");
        }

        //  Set MapTiler API key globally
        if (!process.env.MAP_TOKEN) {
            throw new Error("MapTiler API key is missing. Set MAP_TOKEN in .env");
        }
        config.apiKey = process.env.MAP_TOKEN;

        //  Create new listing
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;

        //Handle image if uploaded
        if (req.file) {
            newListing.image = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        //  Geocode the location
        const response = await geocoding.forward(location, { limit: 1 });

        if (!response.features || response.features.length === 0) {
            req.flash("error", "Invalid location provided!");
            return res.redirect("/listings/new");
        }

        const feature = response.features[0];

        //Explicitly assign geometry in schema format
        newListing.geometry = {
            type: "Point",
            coordinates: feature.geometry.coordinates
        };

        // Save the listing
        const savedListing = await newListing.save();
        console.log("Listing created:", savedListing);

        req.flash("success", "New Listing Created!");
        res.redirect("/listings");

    } catch (err) {
        console.error("Error creating listing:", err);
        req.flash("error", "Something went wrong while creating the listing.");
        res.redirect("/listings");
    }
};



module.exports.editListing=async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you required for does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl= listing.image.url;
    originalImageUrl= originalImageUrl.replace("/upload","/upload/w_250");
    res.render("listings/edit.ejs",{ listing,originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    try {
        let { id } = req.params;

        //  Set MapTiler API key
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

        // Handle new image
        if (req.file) {
            listing.image = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        // Handle new location if changed
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
        res.redirect(`/listings/${id}`);

    } catch (err) {
        console.error("Error updating listing:", err);
        req.flash("error", "Something went wrong while updating the listing.");
        res.redirect("/listings");
    }
};


module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    const deleted = await Listing.findByIdAndDelete(id);
    if (!deleted) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
