import User from "../models/User.js";

/**
 * @desc    Get paginated registered users with optional search by name or email
 * @route   GET /api/admin/users
 * @access  Private (protect, adminOnly)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    // Extract query parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const search = req.query.search ? req.query.search.trim() : "";

    // Build filter query
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Count total matching documents
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit) || 1;

    // Fetch users sorted by newest registered first (createdAt: -1)
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      users,
      totalUsers,
      totalPages,
      currentPage: page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle block/unblock status for a user
 * @route   PATCH /api/admin/users/:id/block
 * @access  Private (protect, adminOnly)
 */
export const toggleBlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from blocking themselves
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "Action disallowed: Administrators cannot block their own account.",
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Prevent blocking other admins
    if (targetUser.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Action disallowed: Cannot block an administrator account.",
      });
    }

    // Toggle boolean status
    targetUser.isBlocked = !targetUser.isBlocked;
    await targetUser.save();

    const actionText = targetUser.isBlocked ? "blocked" : "unblocked";

    res.status(200).json({
      success: true,
      message: `User ${targetUser.name} has been ${actionText} successfully.`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isBlocked: targetUser.isBlocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Admin summary stats (Total, Active, Blocked)
 * @route   GET /api/admin/stats
 * @access  Private (protect, adminOnly)
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: "customer" });
    const blockedUsers = await User.countDocuments({
      role: "customer",
      isBlocked: true,
    });
    const activeUsers = totalUsers - blockedUsers;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};
