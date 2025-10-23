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
  module ::Chatgif
    class TenorController < ::ApplicationController
      requires_plugin "chatgif"
      # Allow anonymous GET access and no XHR requirement (so fetch works)
      skip_before_action :verify_authenticity_token
      skip_before_action :check_xhr

      def search
        api_key = SiteSetting.chatgif_tenor_api_key
        query = params[:q].to_s
        limit = (params[:limit] || 12).to_i

        if api_key.blank?
          render json: { error: "Tenor API key not configured" }, status: 500
          return
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
            render json: data, status: 200
          else
            render json: { error: "Failed to fetch GIFs from Tenor API", status: response.status }, status: 500
          end
        rescue => e
          render json: { error: "Error: #{e.message}" }, status: 500
        end
      end
    end
  end

  Discourse::Application.routes.append do
    get "/chatgif/search" => "chatgif/tenor#search", defaults: { format: :json }
  end
end
