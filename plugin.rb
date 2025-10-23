# name: chatgif
# about: A GIF picker for Discourse chat using Tenor API
# version: 1.0
# authors: Your Name
# url: https://github.com/your-repo/chatgif

register_asset "stylesheets/chatgif.scss"

register_svg_icon "film"

add_admin_route 'chatgif.title', 'chatgif'

DiscoursePluginRegistry.serialized_current_user_fields << "chatgif_enabled"

after_initialize do
  load File.expand_path("../app/controllers/chatgif/tenor_controller.rb", __FILE__)

  Discourse::Application.routes.append do
    get "/chatgif/search" => "chatgif/tenor#search"
  end
end
