package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG014TargetRevisionMarkerScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_014",
        title = "Target Revision Marker",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_013,
        onNavigate = onNavigate,
    ) {
            MFGraphCard("Target history","Each target stays attached to its own dates.")
            MFListItem("Sep 1","Target revised","Marker")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG014TargetRevisionMarkerScreenPreview() {
    MoveFuelTheme { PRG014TargetRevisionMarkerScreen {} }
}
