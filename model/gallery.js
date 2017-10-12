'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const gallerySchema = Schema({
  name: { type: String, required: true },
  desc: { type: String, required: true },
  created: { type: Date, required: true, default: Date.now },
  userID: { type: Schema.Types.ObjectId, required: true },
});

gallerySchema.statics.createGallery = function(body){
  return new this({
    ...body
  }).save();
}

delete mongoose.models.gallery;
module.exports = mongoose.model('gallery', gallerySchema);
