{{- define "vault-paths.getPathName" -}}
{{ printf "%s-%s" (include "common.names.fullname" .root) .path | trunc 63 | replace "/" "-" }}
{{- end -}}

{{- define "vault-paths.secretPaths" -}}
{{- $paths := list -}}
{{- range $path := $.Values.paths -}}
{{- $paths = append $paths (dict "name" (include "vault-paths.getPathName" (dict "root" $ "path" $path)) "path" $path) -}}
{{- end -}}
{{ toJson $paths }}
{{- end }}

{{- define "vault-paths.envFrom" -}}
{{- range $secret := (include "vault-paths.secretPaths" . | fromJsonArray) }}
- secretRef:
    name: {{ $secret.name }}
{{- end -}}
{{- end -}}