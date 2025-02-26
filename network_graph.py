# simplehostmetrics.refac/network_graph.py
# This module defines a Flask Blueprint for handling network graph configurations.
# It provides endpoints to retrieve, update, delete network graph configurations,
# and to list available network interfaces using psutil.

from flask import Blueprint, request, jsonify  # Import Flask components for routing and responses.
import psutil                                    # Used to retrieve system network interfaces.
from models import db, CustomNetworkGraph        # Import the database object and CustomNetworkGraph model.

# Create a Blueprint for network graph related endpoints with the URL prefix '/network_graph'.
network_graph_bp = Blueprint('network_graph', __name__, url_prefix='/network_graph')

@network_graph_bp.route('/config', methods=['GET'])
def get_config():
    """
    GET /network_graph/config
    Retrieve all custom network graph configurations.
    Returns:
        JSON array of network graph objects with their id, graph_name, and interfaces.
    """
    # Query all CustomNetworkGraph records from the database.
    graphs = CustomNetworkGraph.query.all()
    result = []
    # Iterate through each graph and build a dictionary of relevant fields.
    for graph in graphs:
        result.append({
            'id': graph.id,
            'graph_name': graph.graph_name,
            'interfaces': graph.interfaces
        })
    # Return the list of network graph configurations as a JSON response.
    return jsonify(result)

@network_graph_bp.route('/config', methods=['POST'])
def update_config():
    """
    POST /network_graph/config
    Update or create custom network graph configurations.

    Expected JSON format:
    {
      "custom_network_graphs": [
         { "id": optional, "graph_name": "Name", "interfaces": [ { "iface_name": ..., "label": ..., "color": ... }, ... ] },
         ...
      ]
    }

    Process:
    - For each provided network graph configuration, update if an 'id' exists or create a new record otherwise.
    - Commit changes to the database.

    Returns:
        JSON response indicating success and the list of updated/created network graph configurations.
    """
    # Parse JSON data from the incoming request.
    data = request.get_json()
    graphs_data = data.get('custom_network_graphs', [])
    updated_graphs = []
    # Process each network graph configuration.
    for graph_data in graphs_data:
        graph_id = graph_data.get('id')
        if graph_id:
            # Retrieve existing graph by id; if not found, create a new record.
            graph = CustomNetworkGraph.query.get(graph_id)
            if not graph:
                graph = CustomNetworkGraph(id=graph_id)
                db.session.add(graph)
        else:
            # No id provided; create a new network graph record.
            graph = CustomNetworkGraph()
            db.session.add(graph)
        # Update the graph record with the provided data.
        graph.graph_name = graph_data.get('graph_name')
        graph.interfaces = graph_data.get('interfaces', [])
        updated_graphs.append(graph)
    # Commit all changes to the database.
    db.session.commit()
    # Build and return a success response with the updated network graph configurations.
    return jsonify({
        'status': 'success',
        'custom_network_graphs': [
            {'id': g.id, 'graph_name': g.graph_name, 'interfaces': g.interfaces} for g in updated_graphs
        ]
    })

@network_graph_bp.route('/available_interfaces', methods=['GET'])
def available_interfaces():
    """
    GET /network_graph/available_interfaces
    Retrieve a list of all available network interfaces on the host.

    Returns:
        JSON array containing the names of network interfaces.
    """
    # Use psutil to get network interface addresses and extract interface names.
    interfaces = list(psutil.net_if_addrs().keys())
    return jsonify(interfaces)

@network_graph_bp.route('/<int:graph_id>', methods=['DELETE'])
def delete_graph(graph_id):
    """
    DELETE /network_graph/<graph_id>
    Delete a custom network graph configuration by its id.

    Args:
        graph_id (int): The id of the network graph to be deleted.

    Returns:
        JSON response indicating success or error if the graph is not found.
    """
    # Retrieve the network graph configuration by id.
    graph = CustomNetworkGraph.query.get(graph_id)
    if not graph:
        # Return an error response if the graph does not exist.
        return jsonify({'status': 'error', 'message': 'Graph not found'}), 404
    # Delete the graph record from the database.
    db.session.delete(graph)
    db.session.commit()
    # Return a success response indicating the id of the deleted graph.
    return jsonify({'status': 'success', 'deleted': graph_id})
