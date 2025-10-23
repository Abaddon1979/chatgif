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
  module ::ChatGif
    PLUGIN_NAME = "chatgif"
  end

  require_dependency "application_controller"
  
  class ChatGif::TenorController < ::ApplicationController
    requires_plugin ChatGif::PLUGIN_NAME
    skip_before_action :verify_authenticity_token

    def search
      api_key = SiteSetting.chatgif_tenor_api_key
      query = params[:q]
      limit = params[:limit] || 10

      if api_key.blank?
        return render json: { error: "Tenor API key not configured" }, status: 500
      end

      url = "https://tenor.googleapis.com/v2/search"
      query_params = {
        q: query,
        key: api_key,
        client_key: "discourse_chatgif",
        limit: limit,
        media_filter: "gif",
        contentfilter: "high"
      }

      begin
        response = Excon.get(url, query: query_params)
        
        if response.status == 200
          data = JSON.parse(response.body)
          render json: data
        else
          render json: { error: "Failed to fetch GIFs", status: response.status }, status: 500
        end
      rescue => e
        render json: { error: "Error: #{e.message}" }, status: 500
      end
    end
  end

  Discourse::Application.routes.append do
    get "/chatgif/search" => "chatgif/tenor#search"
  end
end
