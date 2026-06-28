export const verifyTurnstile = async (req, res, next) => {
	try {
		const { turnstileToken } = req.body;
		if (!turnstileToken) {
			return res.status(400).json({ message: "Turnstile token missing" });
		}

		const response = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					secret: process.env.TURNSTILE_SECRET_KEY,
					response: turnstileToken,
				}),
			},
		);

		const data = await response.json();
		if (!data.success) {
			return res.status(400).json({ message: "Turnstile verification failed" });
		}
		next();
	} catch (error) {
		return res.status(500).json({
			message: "Turnstile server error",
			error: error.message,
		});
	}
};
