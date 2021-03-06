// eslint-disable-next-line
module.exports = function (grunt) {
  "use strict";


  var sourceFiles = grunt.file.readJSON("sourceFiles.json");
  var testSpecs = "tests/spec/**/*.js";

  var quadFragment      = "<%= grunt.file.read('build/glsl/quad-fragment.glsl') %>";
  var primitiveFragment = "<%= grunt.file.read('build/glsl/primitive-fragment.glsl') %>";
  var quadVertex        = "<%= grunt.file.read('build/glsl/quad-vertex.glsl') %>";
  var primitiveVertex   = "<%= grunt.file.read('build/glsl/primitive-vertex.glsl') %>";

  // Project configuration.
  grunt.initConfig({
    pkg : grunt.file.readJSON("package.json"),
    path : {
      main : "build/<%= pkg.name %>.js",
      min : "build/<%= pkg.name %>.min.js"
    },

    concat : {
      dist : {
        src : sourceFiles,
        dest : "<%= path.main %>"
      }
    },

    replace : {
      dist : {
        options : {
          variables : {
            "__VERSION__"            : "<%= pkg.version %>",
            "__PRIMITIVE_FRAGMENT__" : primitiveFragment,
            "__QUAD_FRAGMENT__"      : quadFragment,
            "__PRIMITIVE_VERTEX__"   : primitiveVertex,
            "__QUAD_VERTEX__"        : quadVertex
          },
          usePrefix : false,
          force : true,
          patterns : [
            {
              match : /this\._super\(\s*([\w\.]+)\s*,\s*"(\w+)"\s*(,\s*)?/g,
              replacement : "$1.prototype.$2.apply(this$3"
            }
          ]
        },
        files : [
          {
            expand : true,
            flatten : true,
            src : [ "<%= path.main %>" ],
            dest : "build/"
          }
        ]
      },

      docs : {
        options : {
          variables : {
            "__VERSION__" : "<%= pkg.version %>"
          },
          usePrefix : false,
          force : true
        },
        files : [
          {
            expand : true,
            src : sourceFiles.concat([ "README.md" ]),
            dest : "build/docs/"
          }
        ]
      },

      glsl : {
        options : {
          preserveOrder : true,
          patterns : [
            {
              // Remove comments
              match : /(\/\/.*?\\n)|(\/\*(.|\\n)*?\*\/)/g,
              replacement : ""
            },
            {
              // Remove leading and trailing whitespace from lines
              match : /(\\n\s+)|(\s+\\n)/g,
              replacement : ""
            },
            {
              // Remove line breaks
              match : /(\\r|\\n)+/g,
              replacement : ""
            },
            {
              // Remove unnecessary whitespace
              match : /\s*([;,[\](){}\\\/\-+*|^&!=<>?~%])\s*/g,
              replacement : "$1"
            }
          ]
        },
        files : [
          {
            expand : true,
            flatten : true,
            src : [ "build/glsl/*.glsl" ],
            dest : "build/glsl/"
          }
        ]
      }
    },

    dot : {
      glsl : {
        options : {
          strip : false
        },
        files : [
          {
            src : "src/video/webgl/glsl/",
            dest : "build/glsl/"
          }
        ]
      }
    },

    uglify : {
      options : {
        report : "min",
        preserveComments :  /(?:^!|@(?:license|preserve|cc_on))/,
        screwIE8 : "true",
        mangle: {
          eval: true
        }
      },
      dist : {
        files : {
          "<%= path.min %>" : [
            "<%= path.main %>"
          ]
        }
      }
    },

    eslint : {
        options : {
          configFile : ".eslintrc.json"
        },

        beforeConcat : {
          files : {
            src : [
              testSpecs,
              sourceFiles,
              "Gruntfile.js",
              "plugins/**/*.js"
            ]
          }
        },

      afterConcat : {
        files : {
          src : [ "<%= path.main %>" ]
        }
      }
    },

    babel: {
        options: {
            sourceMap: false,
            retainLines: true,
            compact: false,
            presets: ["env"]
        },
        dist: {
            files: {
                "<%= path.main %>": "<%= path.main %>"
            }
        }
    },

    clean : {
      dist : [
        "<%= path.main %>",
        "<%= path.min %>"
      ],
      jsdoc : [
        "build/*.map",
        "build/docs",
        "build/glsl/*.glsl",
        "./docs/**/*.*",
        "./docs/scripts",
        "./docs/styles",
        "./docs/images",
        "./docs/img"
      ]
    },

    jsdoc : {
      dist : {
        src : sourceFiles.map(function (value) {
          return value.replace("src/", "build/docs/src/");
        }).concat([ "README.md" ]),
        options : {
          configure : "jsdoc_conf.json",
          destination : "docs",
          template : "tasks/jsdoc-template/template"
        }
      }
    },

    connect : {
      server : {
        options : {
          port : 8001
        }
      },

      keepalive : {
        options : {
          port : 8000,
          keepalive : true
        }
      }
    },

    copy : {
      dist : {
        expand : true,
        src : [
          "index.html",
          "build/melonjs.js",
          "build/melonjs.min.js",
          "docs/**",
          "examples/**",
          "media/logo.png",
          "plugins/**"
        ],
        dest : "dist/"
      }
    },

    buildGhPages : {
      dist : {
        options : {
          dist : "dist",
          build_branch : "gh-pages",
          exclude : [ "node_modules/" ],
          pull : true
        }
      }
    },

    karma: {
      unit: {
        configFile: "karma.conf.js",
        browsers: ["ChromeHeadless"] //other supported options are Chrome and ChromeHeadless
      }
    }

  });

  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-eslint");
  grunt.loadNpmTasks("grunt-contrib-uglify-es");
  grunt.loadNpmTasks("grunt-build-gh-pages");
  grunt.loadNpmTasks("grunt-jsdoc");
  grunt.loadNpmTasks("grunt-karma");
  grunt.loadNpmTasks("grunt-replace");
  grunt.loadNpmTasks("grunt-babel");

  // Custom Tasks
  grunt.loadTasks("tasks");

  // Default task.
  grunt.registerTask("default", [ "test", "uglify" ]);
  grunt.registerTask("build", [ "lint", "uglify" ]);
  grunt.registerTask("glsl", [ "dot:glsl", "replace:glsl" ]);
  grunt.registerTask("lint", [
    "eslint:beforeConcat",
    "glsl",
    "concat",
    "replace:dist",
    "eslint:afterConcat"
  ]);
  grunt.registerTask("es2015", ["babel"]);
  grunt.registerTask("doc", [ "replace:docs", "jsdoc" ]);
  grunt.registerTask("test", [ "lint", "karma" ]);
  grunt.registerTask("serve", [ "connect:keepalive" ]);
  grunt.registerTask("gh-pages", [
    "test",
    "build",
    "doc",
    "copy:dist",
    "buildGhPages:dist"
  ]);
  grunt.registerTask("release", [ "gh-pages", "dorelease" ]);
};
