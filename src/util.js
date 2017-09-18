const flashError = (req, res) => err => {
  req.flash('error', err.message)
  res.redirect(req.originalUrl)
}

module.exports = {
  flashError
}
