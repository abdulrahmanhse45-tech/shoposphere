import Address from "../models/Address.js";

const validateAddressInput = ({
  fullName,
  phone,
  streetAddress,
  city,
  state,
  postalCode,
  addressType,
}) => {
  const requiredFields = [fullName, phone, streetAddress, city, state, postalCode];
  if (requiredFields.some((field) => typeof field !== "string" || !field.trim())) {
    return "Please fill in all required address fields.";
  }

  if (fullName.trim().length < 2 || fullName.trim().length > 80) {
    return "Full name must contain 2 to 80 characters.";
  }

  if (!/^\+?[0-9()\s-]{7,20}$/.test(phone.trim())) {
    return "Please provide a valid phone number.";
  }

  if (streetAddress.trim().length < 5 || streetAddress.trim().length > 160) {
    return "Street address must contain 5 to 160 characters.";
  }

  if (city.trim().length < 2 || state.trim().length < 2) {
    return "City and state must each contain at least 2 characters.";
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(postalCode.trim())) {
    return "Please provide a valid postal / ZIP code.";
  }

  if (addressType && !["Home", "Work", "Other"].includes(addressType)) {
    return "Address category must be Home, Work, or Other.";
  }

  return null;
};

/**
 * @desc    Fetch all addresses for the logged-in user
 * @route   GET /api/addresses
 * @access  Private (protect, checkBlocked)
 */
export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new address
 * @route   POST /api/addresses
 * @access  Private (protect, checkBlocked)
 */
export const addAddress = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      streetAddress,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    const validationError = validateAddressInput({
      fullName,
      phone,
      streetAddress,
      city,
      state,
      postalCode,
      addressType,
    });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Check if this is the user's first address
    const existingCount = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = existingCount === 0 || isDefault === true;

    // If marked as default, unset any existing default address for this user
    if (shouldBeDefault) {
      await Address.updateMany(
        { user: req.user._id, isDefault: true },
        { isDefault: false }
      );
    }

    const newAddress = await Address.create({
      user: req.user._id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      streetAddress: streetAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country ? country.trim() : "India",
      addressType: addressType || "Home",
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully.",
      data: newAddress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing address
 * @route   PUT /api/addresses/:id
 * @access  Private (protect, checkBlocked)
 */
export const updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    const {
      fullName,
      phone,
      streetAddress,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    const validationError = validateAddressInput({
      fullName: fullName ?? address.fullName,
      phone: phone ?? address.phone,
      streetAddress: streetAddress ?? address.streetAddress,
      city: city ?? address.city,
      state: state ?? address.state,
      postalCode: postalCode ?? address.postalCode,
      addressType: addressType ?? address.addressType,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (isDefault === true && !address.isDefault) {
      // Unset previous defaults
      await Address.updateMany(
        { user: req.user._id, isDefault: true },
        { isDefault: false }
      );
      address.isDefault = true;
    }

    if (fullName !== undefined) address.fullName = fullName.trim();
    if (phone !== undefined) address.phone = phone.trim();
    if (streetAddress !== undefined) address.streetAddress = streetAddress.trim();
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state.trim();
    if (postalCode !== undefined) address.postalCode = postalCode.trim();
    if (country !== undefined) address.country = country.trim();
    if (addressType !== undefined) address.addressType = addressType;

    const updatedAddress = await address.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: updatedAddress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an address
 * @route   DELETE /api/addresses/:id
 * @access  Private (protect, checkBlocked)
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    const wasDefault = address.isDefault;
    await Address.deleteOne({ _id: address._id });

    // If deleted address was default, promote another address to default if available
    if (wasDefault) {
      const remainingAddress = await Address.findOne({ user: req.user._id }).sort({
        createdAt: -1,
      });
      if (remainingAddress) {
        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set an address as the default address
 * @route   PATCH /api/addresses/:id/default
 * @access  Private (protect, checkBlocked)
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    // Unset all existing defaults for this user
    await Address.updateMany(
      { user: req.user._id, isDefault: true },
      { isDefault: false }
    );

    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: "Default address updated.",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};
