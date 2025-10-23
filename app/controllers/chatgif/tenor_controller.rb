# frozen_string_literal: true

module Chatgif
  class TenorController < ::ApplicationController
    requires_plugin "chatgif"
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
end
