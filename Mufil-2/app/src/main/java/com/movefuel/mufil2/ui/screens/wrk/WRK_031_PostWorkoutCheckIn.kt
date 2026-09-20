package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK031PostWorkoutCheckInScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_031",
        title = "Post Workout Check In",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_032,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_030,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Easy")
            MFOptionCard("About right",null,true)
            MFOptionCard("Hard")
            MFBodyMapPlaceholder(true)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK031PostWorkoutCheckInScreenPreview() {
    MoveFuelTheme { WRK031PostWorkoutCheckInScreen {} }
}
