import { trustVerificationService } from "../services/trustVerificationService.js";

/**
 * POST /api/verify/scan
 * Analyze an external link or text for fraud and domain legitimacy
 */
export const scanLinkOrText = async (req, res) => {
  try {
    const { url, text } = req.body;
    if (!url && !text) {
      return res.status(400).json({
        success: false,
        message: "Please provide a URL or scholarship text snippet to analyze.",
      });
    }

    const result = await trustVerificationService.analyzeLinkOrText({ url, text });
    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify link or content.",
      error: err.message,
    });
  }
};

/**
 * GET /api/verify/registry
 * Retrieve verified directory of official government and philanthropic portals
 */
export const getOfficialRegistry = async (req, res) => {
  try {
    const registry = trustVerificationService.getOfficialDirectory();
    return res.status(200).json({
      success: true,
      registry,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve verified registry.",
      error: err.message,
    });
  }
};
