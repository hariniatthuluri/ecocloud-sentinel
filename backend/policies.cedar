forbid(principal, action == Action::"recommend", resource)
when { resource.resource_type == "EBS" && resource.analysis_status == "High Waste" };

forbid(principal, action == Action::"recommend", resource)
when { resource.resource_type == "EC2" && resource.analysis_status == "High Waste" };

permit(principal, action == Action::"recommend", resource);