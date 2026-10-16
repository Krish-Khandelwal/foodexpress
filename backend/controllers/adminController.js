import Shop from '../models/Shop.js';

export const getPendingVendors = async (req, res) => {
  try {
    const pendingShops = await Shop.find({ approvalStatus: 'PENDING' })
                                   .populate('ownerId', 'name email phone');
    res.json(pendingShops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVendorStatus = async (req, res) => {
  const { shopId } = req.params;
  const { status } = req.body;
  try {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }
    const updatedShop = await Shop.findByIdAndUpdate(
      shopId,
      { approvalStatus: status, isOpen: status === 'APPROVED' },
      { new: true }
    );
    if (!updatedShop) return res.status(404).json({ message: 'Shop not found' });
    res.json(updatedShop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};