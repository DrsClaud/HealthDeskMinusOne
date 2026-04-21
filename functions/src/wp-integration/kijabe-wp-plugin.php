<?php
/**
 * Plugin Name: HealthDesk Integration
 * Description: Embeds HealthDesk chat in WordPress
 * Version: 1.3.0
 * Author: Eric Murphy
 * Text Domain: healthdesk-integration
 */
defined('ABSPATH') or die('Direct access not allowed');

// Simple autoloader for Firebase JWT library
spl_autoload_register(function ($class) {
    // Only handle Firebase JWT classes
    if (strpos($class, 'Firebase\\JWT\\') === 0) {
        $class_path = str_replace('\\', '/', $class);
        $file = __DIR__ . '/lib/' . $class_path . '.php';
        if (file_exists($file)) {
            require_once $file;
        }
    }
});

class HealthDesk_Kijabe_Integration {
  private $app_url = 'https://hlthdsk.com';
  private $login_endpoint = '/wp-auth-handler';
  private $iframe_height = '800px';
  
  public function __construct() {
    add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
    add_shortcode('healthdesk_embed', array($this, 'embed_healthdesk_shortcode'));
    add_shortcode('healthdesk_button', array($this, 'embed_button_shortcode'));
    add_shortcode('healthdesk_ask_me_anything', array($this, 'embed_ask_me_anything_shortcode'));
    add_shortcode('healthdesk_ask_me_anything_button', array($this, 'embed_ask_me_anything_button_shortcode'));
    add_action('admin_menu', array($this, 'add_admin_menu'));
    register_activation_hook(__FILE__, array($this, 'initialize_plugin_options'));
  }

  public function enqueue_scripts() {
    wp_enqueue_style('healthdesk-styles', plugin_dir_url(__FILE__) . 'healthdesk-styles.css');
  }

  /**
   * Get the default prompt text
   */
  private function get_default_prompt() {
    return 'IMPORTANT: The user has just completed a medical education module on "{pageTitle}".

Please respond to questions in the context of "{pageTitle}" and related medical knowledge.

Your role is to help reinforce their learning by providing accurate medical information related to {pageTitle}. The user is a medical professional or student who needs to consolidate their understanding of this topic.';
  }

  /**
   * Shortcode to embed the HealthDesk application directly in an iframe
   */
  public function embed_healthdesk_shortcode($atts) {
    $attributes = shortcode_atts(array(
      'height' => $this->iframe_height,
      'width' => '100%',
      'class' => 'healthdesk-iframe',
      'wrapper_id' => 'healthdesk-container',
      'wrapper_class' => 'healthdesk-wrapper',
      'assistant_id' => ''  // NEW: Optional assistant ID for Ask Me Anything or other assistants
    ), $atts);
    
    if (!is_user_logged_in()) {
      return '<p>Please log in to access HealthDesk.</p>';
    }
    
    // Check if JWT secret is configured
    if (empty($this->get_jwt_secret())) {
      if (current_user_can('manage_options')) {
        return '<div class="healthdesk-error"><p>Please configure the HealthDesk JWT secret in the <a href="' . admin_url('options-general.php?page=healthdesk-settings') . '">settings page</a>.</p></div>';
      } else {
        return '<div class="healthdesk-error"><p>HealthDesk integration is not fully configured. Please contact the site administrator.</p></div>';
      }
    }
    
    $current_user = wp_get_current_user();
    
    // Get current page information
    global $post;
    $page_title = '';
    $page_url = '';
    
    if ($post) {
      $page_title = get_the_title($post);
      $page_url = get_permalink($post);
    }
    
    $token = $this->generate_jwt_token($current_user, $page_title, $page_url, $attributes['assistant_id']);
    $iframe_url = add_query_arg('token', $token, $this->app_url . $this->login_endpoint);
    
    // Create iframe with wrapper div
    $iframe = sprintf(
      '<iframe src="%s" class="%s" width="%s" height="%s" frameborder="0" allow="clipboard-write"></iframe>',
      esc_url($iframe_url),
      esc_attr($attributes['class']),
      esc_attr($attributes['width']),
      esc_attr($attributes['height'])
    );
    
    // Add wrapper div around iframe
    return sprintf(
      '<div id="%s" class="%s">%s</div>',
      esc_attr($attributes['wrapper_id']),
      esc_attr($attributes['wrapper_class']),
      $iframe
    );
  }
  
  /**
   * Shortcode to display a button that opens HealthDesk in a new tab
   */
  public function embed_button_shortcode($atts) {
    $attributes = shortcode_atts(array(
      'text' => 'Open HealthDesk',
      'class' => 'healthdesk-button',
      'wrapper_id' => 'healthdesk-button-container',
      'wrapper_class' => 'healthdesk-button-wrapper',
      'assistant_id' => ''  // NEW: Optional assistant ID for Ask Me Anything or other assistants
    ), $atts);
    
    if (!is_user_logged_in()) {
      return '<p>Please log in to access HealthDesk.</p>';
    }
    
    // Check if JWT secret is configured
    if (empty($this->get_jwt_secret())) {
      if (current_user_can('manage_options')) {
        return '<div class="healthdesk-error"><p>Please configure the HealthDesk JWT secret in the <a href="' . admin_url('options-general.php?page=healthdesk-settings') . '">settings page</a>.</p></div>';
      } else {
        return '<div class="healthdesk-error"><p>HealthDesk integration is not fully configured. Please contact the site administrator.</p></div>';
      }
    }
    
    $current_user = wp_get_current_user();
    
    // Get current page information
    global $post;
    $page_title = '';
    $page_url = '';
    
    if ($post) {
      $page_title = get_the_title($post);
      $page_url = get_permalink($post);
    }
    
    $token = $this->generate_jwt_token($current_user, $page_title, $page_url, $attributes['assistant_id']);
    $app_url = add_query_arg('token', $token, $this->app_url . $this->login_endpoint);
    
    // Create button
    $button = sprintf(
      '<a href="%s" class="%s" target="_blank">%s</a>',
      esc_url($app_url),
      esc_attr($attributes['class']),
      esc_html($attributes['text'])
    );
    
    // Add wrapper div around button
    return sprintf(
      '<div id="%s" class="%s">%s</div>',
      esc_attr($attributes['wrapper_id']),
      esc_attr($attributes['wrapper_class']),
      $button
    );
  }

  /**
   * Shortcode for "Ask Me Anything" - dedicated assistant with separate rate limits
   */
  public function embed_ask_me_anything_shortcode($atts) {
    $attributes = shortcode_atts(array(
      'height' => $this->iframe_height,
      'width' => '100%',
      'class' => 'healthdesk-iframe',
      'wrapper_id' => 'healthdesk-ask-me-anything-container',
      'wrapper_class' => 'healthdesk-wrapper'
    ), $atts);
    
    if (!is_user_logged_in()) {
      return '<p>Please log in to access HealthDesk.</p>';
    }
    
    // Check if JWT secret is configured
    if (empty($this->get_jwt_secret())) {
      if (current_user_can('manage_options')) {
        return '<div class="healthdesk-error"><p>Please configure the HealthDesk JWT secret in the <a href="' . admin_url('options-general.php?page=healthdesk-settings') . '">settings page</a>.</p></div>';
      } else {
        return '<div class="healthdesk-error"><p>HealthDesk integration is not fully configured. Please contact the site administrator.</p></div>';
      }
    }
    
    $current_user = wp_get_current_user();
    
    // Use fixed page title for separate rate limiting
    $page_title = 'Ask Me Anything';
    $page_url = '';
    
    // Hardcode assistant_id for Ask Me Anything
    $token = $this->generate_jwt_token($current_user, $page_title, $page_url, 'ask_me_anything');
    $iframe_url = add_query_arg('token', $token, $this->app_url . $this->login_endpoint);
    
    // Create iframe with wrapper div
    $iframe = sprintf(
      '<iframe src="%s" class="%s" width="%s" height="%s" frameborder="0" allow="clipboard-write"></iframe>',
      esc_url($iframe_url),
      esc_attr($attributes['class']),
      esc_attr($attributes['width']),
      esc_attr($attributes['height'])
    );
    
    // Add wrapper div around iframe
    return sprintf(
      '<div id="%s" class="%s">%s</div>',
      esc_attr($attributes['wrapper_id']),
      esc_attr($attributes['wrapper_class']),
      $iframe
    );
  }

  /**
   * Button shortcode for "Ask Me Anything" - opens in new tab
   */
  public function embed_ask_me_anything_button_shortcode($atts) {
    $attributes = shortcode_atts(array(
      'text' => 'Ask Me Anything',
      'class' => 'healthdesk-button',
      'wrapper_id' => 'healthdesk-ask-me-anything-button-container',
      'wrapper_class' => 'healthdesk-button-wrapper'
    ), $atts);
    
    if (!is_user_logged_in()) {
      return '<p>Please log in to access HealthDesk.</p>';
    }
    
    // Check if JWT secret is configured
    if (empty($this->get_jwt_secret())) {
      if (current_user_can('manage_options')) {
        return '<div class="healthdesk-error"><p>Please configure the HealthDesk JWT secret in the <a href="' . admin_url('options-general.php?page=healthdesk-settings') . '">settings page</a>.</p></div>';
      } else {
        return '<div class="healthdesk-error"><p>HealthDesk integration is not fully configured. Please contact the site administrator.</p></div>';
      }
    }
    
    $current_user = wp_get_current_user();
    
    // Use fixed page title for separate rate limiting
    $page_title = 'Ask Me Anything';
    $page_url = '';
    
    // Hardcode assistant_id for Ask Me Anything
    $token = $this->generate_jwt_token($current_user, $page_title, $page_url, 'ask_me_anything');
    $app_url = add_query_arg('token', $token, $this->app_url . $this->login_endpoint);
    
    // Create button
    $button = sprintf(
      '<a href="%s" class="%s" target="_blank">%s</a>',
      esc_url($app_url),
      esc_attr($attributes['class']),
      esc_html($attributes['text'])
    );
    
    // Add wrapper div around button
    return sprintf(
      '<div id="%s" class="%s">%s</div>',
      esc_attr($attributes['wrapper_id']),
      esc_attr($attributes['wrapper_class']),
      $button
    );
  }

  /**
   * Generate a JWT token with user information
   */
  private function generate_jwt_token($user, $page_title = '', $page_url = '', $assistant_id = '') {
    // Get the custom prompt and log it for debugging
    $custom_prompt = $this->get_custom_prompt();
    
    $payload = array(
      'user_id' => $user->ID,
      'email' => $user->user_email,
      'display_name' => $user->display_name,
      'wp_username' => $user->user_login,
      'wp_page_title' => $page_title,
      'wp_page_url' => $page_url,
      'custom_prompt' => $custom_prompt,
      'assistant_id' => $assistant_id,  // NEW: Assistant ID for flexible assistant selection
      'iat' => time(),
      'exp' => time() + (60 * 60) // Token expires in 1 hour
    );

    return \Firebase\JWT\JWT::encode($payload, $this->get_jwt_secret(), 'HS256');
  }

  public function initialize_plugin_options() {
    // Only add the option if it doesn't exist already
    if (!get_option('healthdesk_jwt_secret')) {
        // We don't auto-generate a secret anymore - admin must set it
        add_option('healthdesk_jwt_secret', '');
    }
    
    // Add default prompt if it doesn't exist
    if (!get_option('healthdesk_custom_prompt')) {
        add_option('healthdesk_custom_prompt', $this->get_default_prompt());
    }
  }

  private function get_jwt_secret() {
    return get_option('healthdesk_jwt_secret');
  }
  
  private function get_custom_prompt() {
    $prompt = get_option('healthdesk_custom_prompt');
    
    // If prompt is empty, return the default
    if (empty($prompt)) {
        return $this->get_default_prompt();
    }
    
    return $prompt;
  }

  public function add_admin_menu() {
    add_options_page(
        'HealthDesk Settings',
        'HealthDesk',
        'manage_options',
        'healthdesk-settings',
        array($this, 'settings_page')
    );
  }

  public function settings_page() {
    // Handle form submission
    if (isset($_POST['healthdesk_jwt_secret']) && current_user_can('manage_options')) {
        check_admin_referer('healthdesk_settings_update');
        update_option('healthdesk_jwt_secret', sanitize_text_field($_POST['healthdesk_jwt_secret']));
        
        // Process custom prompt
        if (isset($_POST['healthdesk_custom_prompt'])) {
            update_option('healthdesk_custom_prompt', wp_kses_post($_POST['healthdesk_custom_prompt']));
        }
        
        echo '<div class="notice notice-success"><p>Settings updated!</p></div>';
    }
    
    $jwt_secret = get_option('healthdesk_jwt_secret');
    $custom_prompt = get_option('healthdesk_custom_prompt');
    ?>
    <div class="wrap">
        <h2>HealthDesk Integration Settings</h2>
        <form method="post" action="">
            <?php wp_nonce_field('healthdesk_settings_update'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="healthdesk_jwt_secret">JWT Secret</label></th>
                    <td>
                        <input type="text" id="healthdesk_jwt_secret" name="healthdesk_jwt_secret" 
                               value="<?php echo esc_attr($jwt_secret); ?>" class="regular-text">
                        <p class="description">Enter the JWT secret provided by HealthDesk.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="healthdesk_custom_prompt">Custom Prompt</label></th>
                    <td>
                        <textarea id="healthdesk_custom_prompt" name="healthdesk_custom_prompt" 
                                  rows="10" class="large-text code"><?php echo esc_textarea($custom_prompt); ?></textarea>
                        <p class="description">
                            Customize the prompt sent to the AI. Use <code>{pageTitle}</code> as a placeholder to 
                            dynamically insert the current page title.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
  }
}

// Initialize the plugin
new HealthDesk_Kijabe_Integration();
