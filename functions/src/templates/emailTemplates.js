const { getNextAuctionEndDate } = require("../utils/dateUtils");

// Brand colors from theme.js
const BRAND_COLORS = {
  primary: "#1B4584",
  secondary: "#117ACA",
};

// Site configuration
const SITE_URL = process.env.REACT_APP_DOMAIN || "https://hlthdsk.com";

/**
 * Calculate how long the featured placement will last
 * @param {Date} startDate - When the placement started
 * @returns {string} - Human readable duration description
 */
function getFeaturedDuration(startDate = new Date()) {
  const endDate = getNextAuctionEndDate(startDate);
  const diffInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  if (diffInDays === 1) {
    return "until tomorrow (the 15th)";
  } else if (diffInDays < 30) {
    return `for the next ${diffInDays} days (until the 15th)`;
  } else {
    return "until the 15th of next month";
  }
}

/**
 * Email template for successful auction winner
 */
function getAuctionWinnerEmail(winnerEmail, zipCode, winningBid) {
  const bidAmount = (winningBid / 100).toFixed(2);
  const duration = getFeaturedDuration();

  return {
    to: winnerEmail,
    message: {
      subject: `Congratulations! You won the HealthDesk auction for ZIP ${zipCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Auction Winner</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">ZIP Code ${zipCode}</p>
          </div>
          
          <div style="background: white; padding: 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px;">Hey there!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              You just won the HealthDesk auction for ZIP Code ${zipCode} with your bid of $${bidAmount}. 
              Your payment has been processed and your listing is now live.
            </p>
            
            <div style="background: #f0f7ff; border-left: 4px solid ${BRAND_COLORS.primary}; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">What this means for you:</h3>
              <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Your listing now appears prominently in the header for ZIP ${zipCode}</li>
                <li>This featured placement runs ${duration}</li>
                <li>Users searching in ZIP ${zipCode} will see your listing first</li>
              </ul>
            </div>
            
            <div style="background: #fff9e6; border: 1px solid #e6cc00; border-radius: 6px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #666; font-size: 16px;">
                <strong>Pro tip:</strong> Make sure your branding is up to date to get the most out of your featured placement.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${SITE_URL}/dashboard" 
                 style="background: ${BRAND_COLORS.primary}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Thanks for using HealthDesk!<br>
              Questions? Just reply to this email.
            </p>
          </div>
        </div>
      `,
    },
  };
}

/**
 * Email template for payment failure
 */
function getPaymentFailureEmail(winnerEmail, zipCode, winningBid, error) {
  const bidAmount = (winningBid / 100).toFixed(2);

  return {
    to: winnerEmail,
    message: {
      subject: `Payment issue with your HealthDesk auction win (ZIP ${zipCode})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Payment Issue</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">ZIP Code ${zipCode}</p>
          </div>
          
          <div style="background: white; padding: 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px;">Almost there!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              You won the auction for ZIP Code ${zipCode} with your bid of $${bidAmount}, but we couldn't process your payment.
            </p>
            
            <div style="background: #fff5f5; border-left: 4px solid #dc3545; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #721c24; font-size: 18px;">The error we got:</h3>
              <p style="color: #666; margin: 0; font-family: monospace; background: #f7f7f7; padding: 15px; border-radius: 4px; font-size: 14px;">
                ${error}
              </p>
            </div>
            
            <div style="background: #f0f7ff; border-left: 4px solid ${BRAND_COLORS.primary}; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">Here's what to do:</h3>
              <ol style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Check that your payment method is valid and has enough funds</li>
                <li>Update your payment details in your dashboard if needed</li>
                <li>Contact us if you're still having trouble</li>
              </ol>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #666; font-size: 16px;">
                <strong>Time sensitive:</strong> We'll try to process your payment again, but if it keeps failing, 
                you might lose your auction win. Let's get this sorted quickly.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${SITE_URL}/dashboard/billing" 
                 style="background: ${BRAND_COLORS.primary}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 15px; font-size: 16px;">
                Update Payment
              </a>
              <a href="mailto:support@hlthdsk.com" 
                 style="background: #6c757d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                Contact Support
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              ZIP Code: ${zipCode} | Winning Bid: $${bidAmount}<br>
              <br>
              Questions? Just reply to this email for help.
            </p>
          </div>
        </div>
      `,
    },
  };
}

/**
 * Email template for promotion activation
 */
function getPromotionActivationEmail(userEmail, zipCode, amount, endDate) {
  const formattedAmount = (amount / 100).toFixed(2);
  const formattedEndDate = endDate.toDate().toLocaleDateString();

  return {
    to: userEmail,
    message: {
      subject: `Your HealthDesk promotion is now live (ZIP ${zipCode})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Promotion Active</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">ZIP Code ${zipCode}</p>
          </div>
          
          <div style="background: white; padding: 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px;">You're all set!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thanks for your payment of $${formattedAmount}. Your promotion for ZIP Code ${zipCode} is now active 
              and visible to users on the HealthDesk map.
            </p>
            
            <div style="background: #f0f7ff; border-left: 4px solid ${BRAND_COLORS.primary}; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">Promotion details:</h3>
              <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>ZIP Code: ${zipCode}</li>
                <li>Status: Active</li>
                <li>Active until: ${formattedEndDate}</li>
              </ul>
            </div>
            
            <div style="background: #fff9e6; border: 1px solid #e6cc00; border-radius: 6px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #666; font-size: 16px;">
                <strong>Pro tip:</strong> Make sure your branding is up to date to get the most out of your promotion.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${SITE_URL}/dashboard" 
                 style="background: ${BRAND_COLORS.primary}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Thanks for using HealthDesk!<br>
              Questions? Just reply to this email.
            </p>
          </div>
        </div>
      `,
    },
  };
}

/**
 * Email template for invoice payment confirmation (multiple subscriptions)
 */
function getInvoicePaymentEmail(userEmail, amount, activatedAds) {
  const formattedAmount = (amount / 100).toFixed(2);

  return {
    to: userEmail,
    message: {
      subject: `Payment confirmed - Your HealthDesk subscriptions are active`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, ${
            BRAND_COLORS.primary
          } 0%, ${
        BRAND_COLORS.secondary
      } 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Payment Confirmed</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Subscriptions Active</p>
          </div>
          
          <div style="background: white; padding: 30px;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px;">Thanks for your payment!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              We've successfully processed your payment of $${formattedAmount}. Your advertising services are now active 
              and visible to users in these ZIP codes.
            </p>
            
            ${
              activatedAds.length > 0
                ? `
            <div style="background: #f0f7ff; border-left: 4px solid ${
              BRAND_COLORS.primary
            }; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">Activated subscriptions:</h3>
              <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                ${activatedAds
                  .map((zip) => `<li>ZIP Code ${zip}</li>`)
                  .join("")}
              </ul>
            </div>
            `
                : ""
            }
            
            <div style="background: #fff9e6; border: 1px solid #e6cc00; border-radius: 6px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #666; font-size: 16px;">
                <strong>Pro tip:</strong> Make sure your branding is up to date to get the most out of your subscriptions.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${SITE_URL}/dashboard" 
                 style="background: ${
                   BRAND_COLORS.primary
                 }; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Thanks for using HealthDesk!<br>
              Questions? Just reply to this email.
            </p>
          </div>
        </div>
      `,
    },
  };
}

module.exports = {
  getAuctionWinnerEmail,
  getPaymentFailureEmail,
  getPromotionActivationEmail,
  getInvoicePaymentEmail,
  SITE_URL,
};
