package com.movefuel.mufil2

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.movefuel.mufil2.ui.MoveFuelApp
import com.movefuel.mufil2.ui.design.MoveFuelTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MoveFuelTheme {
                MoveFuelApp()
            }
        }
    }
}
